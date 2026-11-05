import "server-only";
import { cache } from "react";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { resolveImage } from "@/lib/domain/images";

export type PublicChoice = { id: string; name: string; priceDeltaCents: number; isDefault: boolean; isAvailable: boolean };
export type PublicGroup = {
  id: string;
  name: string;
  kind: "PORTION" | "MODIFIER";
  required: boolean;
  minSelect: number;
  maxSelect: number;
  choices: PublicChoice[];
};
export type PublicDish = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  portion: string | null;
  priceCents: number;
  image: string | null;
  imageAlt: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isDailySpecial: boolean;
  isVegetarian: boolean;
  spiceLevel: number;
  ingredients: string | null;
  allergens: string[];
  mayContain: string[];
  allergensConfirmed: boolean;
  maxPerOrder: number;
  prepLeadHours: number;
  availableDays: number[];
  dailyLimit: number | null;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  optionGroups: PublicGroup[];
  /** Units ordered in recent paid orders (automatic, drives "Most loved") */
  orderedCount: number;
  isMostLoved: boolean;
};
export type PublicCategory = { id: string; slug: string; name: string; description: string | null; dishes: PublicDish[] };

type ItemRow = typeof schema.menuItems.$inferSelect & {
  category: typeof schema.categories.$inferSelect;
  optionGroups: (typeof schema.optionGroups.$inferSelect & { choices: (typeof schema.optionChoices.$inferSelect)[] })[];
};

export function toPublicDish(i: ItemRow): PublicDish {
  return {
    id: i.id,
    slug: i.slug,
    name: i.name,
    shortDescription: i.shortDescription,
    description: i.description,
    portion: i.portion,
    priceCents: i.priceCents,
    image: resolveImage(i.imagePath),
    imageAlt: i.imageAlt ?? i.name,
    isAvailable: i.isAvailable,
    isFeatured: i.isFeatured,
    isDailySpecial: i.isDailySpecial,
    isVegetarian: i.isVegetarian,
    spiceLevel: i.spiceLevel,
    ingredients: i.ingredients,
    allergens: i.allergens,
    mayContain: i.mayContain,
    allergensConfirmed: i.allergensConfirmed,
    maxPerOrder: i.maxPerOrder,
    prepLeadHours: i.prepLeadHours,
    availableDays: i.availableDays,
    dailyLimit: i.dailyLimit,
    categoryId: i.categoryId,
    categorySlug: i.category.slug,
    categoryName: i.category.name,
    optionGroups: [...i.optionGroups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({
        id: g.id,
        name: g.name,
        kind: g.kind,
        required: g.required,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        choices: [...g.choices]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => ({ id: c.id, name: c.name, priceDeltaCents: c.priceDeltaCents, isDefault: c.isDefault, isAvailable: c.isAvailable })),
      })),
    orderedCount: 0,
    isMostLoved: false,
  };
}

/** Paid orders count towards popularity; unpaid, failed, expired and cancelled ones don't */
const COUNTED = ["NEW", "CONFIRMED", "PREPARING", "READY", "COLLECTED"] as const;
export const POPULAR_WINDOW_DAYS = 120;
export const MOST_LOVED_TOP = 4;
export const MOST_LOVED_MIN_UNITS = 3;

/** Units ordered per dish over the popularity window. Recomputed on every request, no manual work. */
export const getPopularity = cache(async (): Promise<Map<string, number>> => {
  const db = getDb();
  const rows = await db.execute<{ id: string; units: string }>(sql`
    select oi.menu_item_id as id, sum(oi.quantity)::text as units
    from ${schema.orderItems} oi
    join ${schema.orders} o on o.id = oi.order_id
    where o.status in (${sql.join(COUNTED.map((c) => sql`${c}`), sql`, `)})
      and o.created_at > now() - make_interval(days => ${POPULAR_WINDOW_DAYS})
      and oi.menu_item_id is not null
    group by oi.menu_item_id`);
  return new Map(rows.rows.map((r) => [r.id, Number(r.units)]));
});

function applyPopularity(dishes: PublicDish[], pop: Map<string, number>) {
  for (const d of dishes) d.orderedCount = pop.get(d.id) ?? 0;
  const top = [...dishes]
    .filter((d) => d.orderedCount >= MOST_LOVED_MIN_UNITS)
    .sort((a, b) => b.orderedCount - a.orderedCount)
    .slice(0, MOST_LOVED_TOP);
  for (const d of top) d.isMostLoved = true;
}

const withRelations = {
  category: true,
  optionGroups: { with: { choices: true } },
} as const;

/** All visible, non-archived dishes grouped by category (sold-out dishes included, flagged) */
export const getPublicMenu = cache(async (): Promise<PublicCategory[]> => {
  const db = getDb();
  const cats = await db.query.categories.findMany({
    where: eq(schema.categories.isVisible, true),
    orderBy: asc(schema.categories.sortOrder),
  });
  const items = await db.query.menuItems.findMany({
    where: eq(schema.menuItems.isArchived, false),
    with: withRelations,
    orderBy: [asc(schema.menuItems.sortOrder), asc(schema.menuItems.name)],
  });
  const pop = await getPopularity();
  const result = cats
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      dishes: items.filter((i) => i.categoryId === c.id).map((i) => toPublicDish(i as ItemRow)),
    }))
    .filter((c) => c.dishes.length > 0);
  applyPopularity(result.flatMap((c) => c.dishes), pop);
  return result;
});

export const getDishBySlug = cache(async (slug: string): Promise<PublicDish | null> => {
  const db = getDb();
  const item = await db.query.menuItems.findFirst({
    where: and(eq(schema.menuItems.slug, slug), eq(schema.menuItems.isArchived, false)),
    with: withRelations,
  });
  if (!item || !item.category.isVisible) return null;
  const menu = await getPublicMenu();
  return menu.flatMap((c) => c.dishes).find((d) => d.id === item.id) ?? toPublicDish(item as ItemRow);
});

export async function getFeaturedDishes(): Promise<PublicDish[]> {
  const menu = await getPublicMenu();
  return menu.flatMap((c) => c.dishes).filter((d) => d.isFeatured);
}

/**
 * Dishes for the homepage carousel: customers' most-ordered dishes first (automatic),
 * then the owner's featured picks, then anything else with a photo.
 */
export async function getFavouriteDishes(limit = 10): Promise<PublicDish[]> {
  const all = (await getPublicMenu()).flatMap((c) => c.dishes).filter((d) => d.isAvailable);
  const score = (d: PublicDish) => d.orderedCount * 100 + (d.isFeatured ? 50 : 0) + (d.image ? 10 : 0);
  return [...all].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function getDailySpecials(): Promise<PublicDish[]> {
  const menu = await getPublicMenu();
  return menu.flatMap((c) => c.dishes).filter((d) => d.isDailySpecial);
}
