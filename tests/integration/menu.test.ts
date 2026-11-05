import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetDb, closeDb, owner } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { quoteCart } from "@/lib/server/cart";
import { archiveMenuItem, deleteCategory, quickUpdateItem, saveCategory, saveMenuItem, setItemAvailability, adminMenuItem } from "@/lib/server/menu-admin";
import { getPublicMenu } from "@/lib/server/menu";

let db: DB;
beforeAll(async () => {
  db = await resetDb();
});
afterAll(closeDb);

const bySlug = async (slug: string) => (await db.select().from(schema.menuItems).where(eq(schema.menuItems.slug, slug)))[0];

describe("seeded menu", () => {
  it("has all 31 dishes from the price list in 7 categories", async () => {
    expect((await db.select().from(schema.menuItems)).length).toBe(31);
    expect((await db.select().from(schema.categories)).length).toBe(7);
    const biryani = await bySlug("shahi-chicken-biryani");
    expect(biryani.priceCents).toBe(1200);
    expect((await bySlug("shahi-daleem")).priceCents).toBe(2000);
    expect(biryani.allergensConfirmed).toBe(false);
  });
});

describe("server-side cart quote", () => {
  it("prices from the database and ignores anything else", async () => {
    const biryani = await bySlug("shahi-chicken-biryani");
    const full = await adminMenuItem(biryani.id, db);
    const medium = full!.optionGroups[0].choices.find((c) => c.name === "Medium")!;
    const q = await quoteCart([{ menuItemId: biryani.id, quantity: 3, choiceIds: [medium.id], priceCents: 1 } as never], db, false);
    expect(q.errors).toEqual([]);
    expect(q.totalCents).toBe(3600);
  });

  it("reflects owner price changes and sold-out immediately", async () => {
    const kheer = await bySlug("shahi-kheer");
    expect((await quickUpdateItem(owner, kheer.id, { priceCents: 1150 }, db)).ok).toBe(true);
    let q = await quoteCart([{ menuItemId: kheer.id, quantity: 2, choiceIds: [] }], db, false);
    expect(q.totalCents).toBe(2300);
    await setItemAvailability(owner, kheer.id, false, db);
    q = await quoteCart([{ menuItemId: kheer.id, quantity: 2, choiceIds: [] }], db, false);
    expect(q.lines).toHaveLength(0);
    expect(q.errors[0].message).toMatch(/sold out/);
    await setItemAvailability(owner, kheer.id, true, db);
  });

  it("rejects negative or invalid quick price edits", async () => {
    const kheer = await bySlug("shahi-kheer");
    expect((await quickUpdateItem(owner, kheer.id, { priceCents: -5 }, db)).ok).toBe(false);
    expect((await quickUpdateItem(owner, kheer.id, { priceCents: 12.5 }, db)).ok).toBe(false);
  });
});

describe("dish editor with portions and modifiers", () => {
  it("creates a dish with a portion group and add-ons, then keeps choice ids stable on edit", async () => {
    const cat = (await db.select().from(schema.categories))[0];
    const input = {
      name: "Mutton Karahi",
      slug: "mutton-karahi",
      categoryId: cat.id,
      shortDescription: "Test dish",
      description: "",
      portion: null,
      priceCents: 1800,
      imagePath: null,
      imageAlt: null,
      isAvailable: true,
      isFeatured: false,
      isDailySpecial: false,
      isVegetarian: false,
      spiceLevel: 2,
      ingredients: null,
      allergens: ["Milk"],
      mayContain: [],
      allergensConfirmed: true,
      gstTreatment: "TAXABLE",
      dailyLimit: 10,
      maxPerOrder: 5,
      prepLeadHours: 48,
      availableDays: [5, 6],
      optionGroups: [
        { name: "Portion", kind: "PORTION", required: true, minSelect: 1, maxSelect: 1, choices: [{ name: "Half kg", priceDeltaCents: 0, isDefault: true, isAvailable: true }, { name: "Full kg", priceDeltaCents: 1600, isDefault: false, isAvailable: true }] },
        { name: "Extras", kind: "MODIFIER", required: false, minSelect: 0, maxSelect: 2, choices: [{ name: "Naan", priceDeltaCents: 250, isDefault: false, isAvailable: true }, { name: "Dip", priceDeltaCents: 300, isDefault: false, isAvailable: true }] },
      ],
    };
    const r = await saveMenuItem(owner, input, db);
    expect(r.ok).toBe(true);
    const id = r.ok ? r.data.id : "";
    const saved = await adminMenuItem(id, db);
    const full = saved!.optionGroups[0].choices.find((c) => c.name === "Full kg")!;
    const naan = saved!.optionGroups[1].choices.find((c) => c.name === "Naan")!;

    const q = await quoteCart([{ menuItemId: id, quantity: 2, choiceIds: [full.id, naan.id] }], db, false);
    expect(q.totalCents).toBe((1800 + 1600 + 250) * 2);

    // Edit: rename a choice and change price — ids stay the same
    const edit = { ...input, id, priceCents: 1900, optionGroups: saved!.optionGroups.map((g) => ({ id: g.id, name: g.name, kind: g.kind, required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect, choices: g.choices.map((c) => ({ id: c.id, name: c.name === "Naan" ? "Garlic naan" : c.name, priceDeltaCents: c.priceDeltaCents, isDefault: c.isDefault, isAvailable: c.isAvailable })) })) };
    expect((await saveMenuItem(owner, edit, db)).ok).toBe(true);
    const q2 = await quoteCart([{ menuItemId: id, quantity: 1, choiceIds: [full.id, naan.id] }], db, false);
    expect(q2.errors).toEqual([]);
    expect(q2.lines[0].options.map((o) => o.choice)).toEqual(["Full kg", "Garlic naan"]);
    expect(q2.totalCents).toBe(1900 + 1600 + 250);

    const logs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, id));
    expect(logs.map((l) => l.action).sort()).toEqual(["menu.create", "menu.update"]);
  });

  it("validates portion groups and slugs", async () => {
    const cat = (await db.select().from(schema.categories))[0];
    const bad = await saveMenuItem(owner, { name: "X", slug: "Bad Slug!", categoryId: cat.id, priceCents: -1 }, db);
    expect(bad.ok).toBe(false);
    const dup = await saveMenuItem(
      owner,
      { name: "Dup", slug: "shahi-kheer", categoryId: cat.id, shortDescription: "", description: "", portion: null, priceCents: 100, imagePath: null, imageAlt: null, isAvailable: true, isFeatured: false, isDailySpecial: false, isVegetarian: false, spiceLevel: 0, ingredients: null, allergens: [], mayContain: [], allergensConfirmed: false, gstTreatment: "TAXABLE", dailyLimit: null, maxPerOrder: 5, prepLeadHours: 0, availableDays: [], optionGroups: [] },
      db,
    );
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.fieldErrors?.slug).toBeTruthy();
  });

  it("archived dishes and hidden categories disappear from the public menu", async () => {
    const korma = await bySlug("shahi-chicken-korma");
    await archiveMenuItem(owner, korma.id, true, db);
    let menu = await getPublicMenu();
    expect(menu.flatMap((c) => c.dishes).some((d) => d.slug === "shahi-chicken-korma")).toBe(false);
    await archiveMenuItem(owner, korma.id, false, db);

    const dips = (await db.select().from(schema.categories).where(eq(schema.categories.slug, "dips")))[0];
    await saveCategory(owner, { id: dips.id, name: dips.name, slug: dips.slug, description: null, isVisible: false }, db);
    menu = await getPublicMenu();
    expect(menu.some((c) => c.slug === "dips")).toBe(false);
    expect((await deleteCategory(owner, dips.id, db)).ok).toBe(false); // still has dishes
  });
});
