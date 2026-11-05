import "server-only";
import { and, asc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/lib/db";
import { categorySchema, menuItemSchema, type CategoryInput, type MenuItemInput } from "@/lib/domain/menu-schema";
import { audit } from "./audit";
import type { StaffUser } from "./auth";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodToResult(error: import("zod").ZodError): Result<never> {
  const fieldErrors: Record<string, string> = {};
  for (const i of error.issues) fieldErrors[i.path.join(".")] ??= i.message;
  return { ok: false, error: error.issues[0]?.message ?? "Check the form", fieldErrors };
}

/* ---------------- Dishes ---------------- */

export async function setItemAvailability(actor: StaffUser, itemId: string, available: boolean, db: DB = getDb()): Promise<Result> {
  const [row] = await db.update(schema.menuItems).set({ isAvailable: available }).where(eq(schema.menuItems.id, itemId)).returning({ id: schema.menuItems.id, name: schema.menuItems.name });
  if (!row) return { ok: false, error: "Dish not found" };
  await audit(actor, available ? "menu.available" : "menu.sold_out", "menu_item", itemId, { name: row.name }, db);
  return { ok: true, data: undefined };
}

export async function quickUpdateItem(
  actor: StaffUser,
  itemId: string,
  patch: { priceCents?: number; isFeatured?: boolean; isDailySpecial?: boolean },
  db: DB = getDb(),
): Promise<Result> {
  if (patch.priceCents !== undefined && (!Number.isInteger(patch.priceCents) || patch.priceCents < 0 || patch.priceCents > 1_000_000)) {
    return { ok: false, error: "Enter a valid price" };
  }
  const [before] = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, itemId)).limit(1);
  if (!before) return { ok: false, error: "Dish not found" };
  await db.update(schema.menuItems).set(patch).where(eq(schema.menuItems.id, itemId));
  const changes: Record<string, unknown> = {};
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) if (before[k] !== patch[k]) changes[k] = { from: before[k], to: patch[k] };
  if (Object.keys(changes).length) await audit(actor, "menu.update", "menu_item", itemId, { name: before.name, changes }, db);
  return { ok: true, data: undefined };
}

export async function saveMenuItem(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<Result<{ id: string }>> {
  const parsed = menuItemSchema.safeParse(raw);
  if (!parsed.success) return zodToResult(parsed.error);
  const input: MenuItemInput = parsed.data;

  const [cat] = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.id, input.categoryId)).limit(1);
  if (!cat) return { ok: false, error: "Choose a category", fieldErrors: { categoryId: "Choose a category" } };
  const clash = await db
    .select({ id: schema.menuItems.id })
    .from(schema.menuItems)
    .where(input.id ? and(eq(schema.menuItems.slug, input.slug), ne(schema.menuItems.id, input.id)) : eq(schema.menuItems.slug, input.slug))
    .limit(1);
  if (clash.length) return { ok: false, error: "Another dish already uses that web address", fieldErrors: { slug: "Already used by another dish" } };

  const { optionGroups, id, ...fields } = input;
  const result = await db.transaction(async (tx) => {
    let itemId = id;
    let before: typeof schema.menuItems.$inferSelect | undefined;
    if (itemId) {
      [before] = await tx.select().from(schema.menuItems).where(eq(schema.menuItems.id, itemId)).limit(1);
      if (!before) return null;
      await tx.update(schema.menuItems).set(fields).where(eq(schema.menuItems.id, itemId));
    } else {
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${schema.menuItems.sortOrder}), -1)` })
        .from(schema.menuItems)
        .where(eq(schema.menuItems.categoryId, fields.categoryId));
      const [row] = await tx
        .insert(schema.menuItems)
        .values({ ...fields, sortOrder: Number(max) + 1 })
        .returning({ id: schema.menuItems.id });
      itemId = row.id;
    }

    // Upsert option groups/choices, keeping ids stable so carts holding them stay valid
    const existingGroups = await tx.select().from(schema.optionGroups).where(eq(schema.optionGroups.menuItemId, itemId));
    const existingGroupIds = new Set(existingGroups.map((g) => g.id));
    const keptGroupIds: string[] = [];
    for (const [gi, g] of optionGroups.entries()) {
      const groupValues = { name: g.name, kind: g.kind, required: g.required, minSelect: g.required ? Math.max(1, g.minSelect) : g.minSelect, maxSelect: g.maxSelect, sortOrder: gi };
      let groupId = g.id && existingGroupIds.has(g.id) ? g.id : undefined;
      if (groupId) await tx.update(schema.optionGroups).set(groupValues).where(eq(schema.optionGroups.id, groupId));
      else [{ id: groupId }] = await tx.insert(schema.optionGroups).values({ ...groupValues, menuItemId: itemId }).returning({ id: schema.optionGroups.id });
      keptGroupIds.push(groupId);

      const existingChoices = await tx.select({ id: schema.optionChoices.id }).from(schema.optionChoices).where(eq(schema.optionChoices.groupId, groupId));
      const existingChoiceIds = new Set(existingChoices.map((c) => c.id));
      const keptChoiceIds: string[] = [];
      for (const [ci, c] of g.choices.entries()) {
        const choiceValues = { name: c.name, priceDeltaCents: c.priceDeltaCents, isDefault: c.isDefault, isAvailable: c.isAvailable, sortOrder: ci };
        if (c.id && existingChoiceIds.has(c.id)) {
          await tx.update(schema.optionChoices).set(choiceValues).where(eq(schema.optionChoices.id, c.id));
          keptChoiceIds.push(c.id);
        } else {
          const [row] = await tx.insert(schema.optionChoices).values({ ...choiceValues, groupId }).returning({ id: schema.optionChoices.id });
          keptChoiceIds.push(row.id);
        }
      }
      await tx.delete(schema.optionChoices).where(and(eq(schema.optionChoices.groupId, groupId), keptChoiceIds.length ? notInArray(schema.optionChoices.id, keptChoiceIds) : sql`true`));
    }
    await tx.delete(schema.optionGroups).where(and(eq(schema.optionGroups.menuItemId, itemId), keptGroupIds.length ? notInArray(schema.optionGroups.id, keptGroupIds) : sql`true`));

    const changes: Record<string, unknown> = {};
    if (before) {
      for (const [k, v] of Object.entries(fields)) {
        const prev = (before as Record<string, unknown>)[k];
        if (JSON.stringify(prev) !== JSON.stringify(v)) changes[k] = { from: prev, to: v };
      }
    }
    await audit(actor, before ? "menu.update" : "menu.create", "menu_item", itemId, { name: fields.name, changes, optionGroups: optionGroups.length }, tx);
    return itemId;
  });
  if (!result) return { ok: false, error: "Dish not found" };
  return { ok: true, data: { id: result } };
}

/** Archive instead of delete: past orders still reference the dish */
export async function archiveMenuItem(actor: StaffUser, itemId: string, archived: boolean, db: DB = getDb()): Promise<Result> {
  const [row] = await db.update(schema.menuItems).set({ isArchived: archived }).where(eq(schema.menuItems.id, itemId)).returning({ name: schema.menuItems.name });
  if (!row) return { ok: false, error: "Dish not found" };
  await audit(actor, archived ? "menu.archive" : "menu.restore", "menu_item", itemId, { name: row.name }, db);
  return { ok: true, data: undefined };
}

export async function moveMenuItem(actor: StaffUser, itemId: string, direction: -1 | 1, db: DB = getDb()): Promise<Result> {
  const [item] = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, itemId)).limit(1);
  if (!item) return { ok: false, error: "Dish not found" };
  const siblings = await db.select().from(schema.menuItems).where(eq(schema.menuItems.categoryId, item.categoryId)).orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
  const idx = siblings.findIndex((s) => s.id === itemId);
  const swap = siblings[idx + direction];
  if (!swap) return { ok: true, data: undefined };
  const ordered = [...siblings];
  [ordered[idx], ordered[idx + direction]] = [ordered[idx + direction], ordered[idx]];
  await db.transaction(async (tx) => {
    for (const [i, s] of ordered.entries()) await tx.update(schema.menuItems).set({ sortOrder: i }).where(eq(schema.menuItems.id, s.id));
  });
  return { ok: true, data: undefined };
}

/* ---------------- Categories ---------------- */

export async function saveCategory(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<Result<{ id: string }>> {
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return zodToResult(parsed.error);
  const input: CategoryInput = parsed.data;
  const clash = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(input.id ? and(eq(schema.categories.slug, input.slug), ne(schema.categories.id, input.id)) : eq(schema.categories.slug, input.slug))
    .limit(1);
  if (clash.length) return { ok: false, error: "Another category uses that web address", fieldErrors: { slug: "Already used" } };
  const { id, ...fields } = input;
  if (id) {
    const [row] = await db.update(schema.categories).set(fields).where(eq(schema.categories.id, id)).returning({ id: schema.categories.id });
    if (!row) return { ok: false, error: "Category not found" };
    await audit(actor, "category.update", "category", id, fields, db);
    return { ok: true, data: { id } };
  }
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${schema.categories.sortOrder}), -1)` }).from(schema.categories);
  const [row] = await db.insert(schema.categories).values({ ...fields, sortOrder: Number(max) + 1 }).returning({ id: schema.categories.id });
  await audit(actor, "category.create", "category", row.id, fields, db);
  return { ok: true, data: { id: row.id } };
}

export async function moveCategory(actor: StaffUser, id: string, direction: -1 | 1, db: DB = getDb()): Promise<Result> {
  const all = await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, error: "Category not found" };
  if (!all[idx + direction]) return { ok: true, data: undefined };
  [all[idx], all[idx + direction]] = [all[idx + direction], all[idx]];
  await db.transaction(async (tx) => {
    for (const [i, c] of all.entries()) await tx.update(schema.categories).set({ sortOrder: i }).where(eq(schema.categories.id, c.id));
  });
  await audit(actor, "category.reorder", "category", id, { direction }, db);
  return { ok: true, data: undefined };
}

export async function deleteCategory(actor: StaffUser, id: string, db: DB = getDb()): Promise<Result> {
  const items = await db.select({ id: schema.menuItems.id }).from(schema.menuItems).where(eq(schema.menuItems.categoryId, id)).limit(1);
  if (items.length) return { ok: false, error: "Move or archive this category's dishes first. Archived dishes still belong to it — hide the category instead." };
  const [row] = await db.delete(schema.categories).where(eq(schema.categories.id, id)).returning({ name: schema.categories.name });
  if (!row) return { ok: false, error: "Category not found" };
  await audit(actor, "category.delete", "category", id, { name: row.name }, db);
  return { ok: true, data: undefined };
}

/* ---------------- Queries for admin pages ---------------- */

export async function adminMenu(db: DB = getDb()) {
  const cats = await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  const items = await db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
  return cats.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) }));
}

export async function adminMenuItem(id: string, db: DB = getDb()) {
  return db.query.menuItems.findFirst({
    where: eq(schema.menuItems.id, id),
    with: { optionGroups: { with: { choices: { orderBy: asc(schema.optionChoices.sortOrder) } }, orderBy: asc(schema.optionGroups.sortOrder) } },
  });
}

export async function categoryItemCounts(ids: string[], db: DB = getDb()) {
  if (!ids.length) return new Map<string, number>();
  const rows = await db
    .select({ categoryId: schema.menuItems.categoryId, n: sql<number>`count(*)::int` })
    .from(schema.menuItems)
    .where(inArray(schema.menuItems.categoryId, ids))
    .groupBy(schema.menuItems.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.n]));
}
