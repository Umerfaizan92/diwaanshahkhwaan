import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as s from "../src/lib/db/schema";
import { CATALOG } from "../src/lib/menu/catalog";
import { BUSINESS_DEFAULTS } from "../src/lib/config/business";
import { STOCK_PHOTOS } from "../src/lib/menu/stock-photos";

/**
 * Idempotent seed: inserts defaults only where rows don't exist yet,
 * so re-running never overwrites the owner's edits.
 */
export async function seed(url: string, opts: { quiet?: boolean } = {}) {
  const ssl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
  const pool = new Pool({ connectionString: url, ssl });
  const db = drizzle(pool, { schema: s });
  const log = (...a: unknown[]) => !opts.quiet && console.log(...a);

  await db
    .insert(s.businessSettings)
    .values({
      id: 1,
      businessName: BUSINESS_DEFAULTS.businessName,
      tagline: BUSINESS_DEFAULTS.tagline,
      contacts: BUSINESS_DEFAULTS.contacts,
      pickupArea: BUSINESS_DEFAULTS.pickupArea,
      pickupInstructions: BUSINESS_DEFAULTS.pickupInstructions,
      pickupAddress: BUSINESS_DEFAULTS.pickupAddress,
      gstMode: "ADD_ON",
      gstRegistered: true,
      ownerNotifyPhone: BUSINESS_DEFAULTS.contacts[0].phone,
    })
    .onConflictDoNothing();

  for (let d = 0; d < 7; d++) {
    await db.insert(s.openingHours).values({ dayOfWeek: d, isOpen: true, openTime: "12:00", closeTime: "20:00" }).onConflictDoNothing();
  }

  let catOrder = 0;
  for (const cat of CATALOG) {
    await db
      .insert(s.categories)
      .values({ slug: cat.slug, name: cat.name, description: cat.description, sortOrder: catOrder++ })
      .onConflictDoNothing();
    const [c] = await db.select().from(s.categories).where(eqSlug(s.categories.slug, cat.slug));
    let order = 0;
    for (const d of cat.dishes) {
      const inserted = await db
        .insert(s.menuItems)
        .values({
          slug: d.slug,
          name: d.name,
          shortDescription: d.short,
          description: d.description,
          portion: d.portion ?? null,
          priceCents: Math.round(d.price * 100),
          categoryId: c.id,
          imagePath: d.image ?? STOCK_PHOTOS[d.slug]?.url ?? null,
          imageAlt: d.imageAlt ?? STOCK_PHOTOS[d.slug]?.alt ?? null,
          isFeatured: d.featured ?? false,
          isDailySpecial: d.special ?? false,
          isVegetarian: d.vegetarian ?? false,
          spiceLevel: d.spice ?? 0,
          sortOrder: order++,
        })
        .onConflictDoNothing()
        .returning({ id: s.menuItems.id });
      if (inserted.length && d.options) {
        let go = 0;
        for (const g of d.options) {
          const [grp] = await db
            .insert(s.optionGroups)
            .values({
              menuItemId: inserted[0].id,
              name: g.name,
              kind: g.kind,
              required: g.required,
              minSelect: g.required ? 1 : 0,
              maxSelect: g.maxSelect,
              sortOrder: go++,
            })
            .returning();
          let co = 0;
          for (const ch of g.choices) {
            await db.insert(s.optionChoices).values({
              groupId: grp.id,
              name: ch.name,
              priceDeltaCents: ch.priceDeltaCents ?? 0,
              isDefault: ch.isDefault ?? false,
              sortOrder: co++,
            });
          }
        }
      }
    }
  }
  log("Menu seeded");

  const email = process.env.SEED_OWNER_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("SEED_OWNER_PASSWORD must be at least 12 characters");
    await db
      .insert(s.staffUsers)
      .values({ email, name: "Owner", passwordHash: await bcrypt.hash(password, 12), role: "OWNER" })
      .onConflictDoNothing();
    log(`Owner login ensured for ${email}`);
  }
  await pool.end();
}

import { eq } from "drizzle-orm";
function eqSlug(col: typeof s.categories.slug, v: string) {
  return eq(col, v);
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const url = process.argv[2] === "--test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) throw new Error("Database URL not set");
  seed(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
