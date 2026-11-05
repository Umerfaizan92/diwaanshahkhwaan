import { describe, expect, it } from "vitest";
import { lineKey, priceCart, type CatalogItem } from "@/lib/domain/pricing";

const spice = {
  id: "g-spice",
  name: "Spice level",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  choices: [
    { id: "mild", name: "Mild", priceDeltaCents: 0, isAvailable: true },
    { id: "hot", name: "Hot", priceDeltaCents: 0, isAvailable: true },
  ],
};
const portion = {
  id: "g-portion",
  name: "Portion",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  choices: [
    { id: "half", name: "Half kg", priceDeltaCents: 0, isAvailable: true },
    { id: "full", name: "Full kg", priceDeltaCents: 1500, isAvailable: true },
  ],
};
const extras = {
  id: "g-extra",
  name: "Extras",
  required: false,
  minSelect: 0,
  maxSelect: 2,
  choices: [
    { id: "dip", name: "Extra garlic dip", priceDeltaCents: 300, isAvailable: true },
    { id: "naan", name: "Naan", priceDeltaCents: 250, isAvailable: true },
    { id: "raita", name: "Raita", priceDeltaCents: 200, isAvailable: false },
  ],
};

function item(p: Partial<CatalogItem> & { id: string }): CatalogItem {
  return { name: p.id, priceCents: 1200, isAvailable: true, isArchived: false, maxPerOrder: 10, gstTreatment: "TAXABLE", optionGroups: [], ...p };
}
const catalog = new Map<string, CatalogItem>([
  ["biryani", item({ id: "biryani", name: "Biryani", priceCents: 1200, optionGroups: [spice] })],
  ["karahi", item({ id: "karahi", name: "Karahi", priceCents: 1500, optionGroups: [portion, extras] })],
  ["kheer", item({ id: "kheer", name: "Kheer", priceCents: 1000, gstTreatment: "GST_FREE" })],
  ["soldout", item({ id: "soldout", name: "Daleem", isAvailable: false })],
  ["archived", item({ id: "archived", isArchived: true })],
]);

describe("priceCart", () => {
  it("uses catalogue prices and option deltas, never client values", () => {
    const q = priceCart([{ menuItemId: "karahi", quantity: 2, choiceIds: ["full", "dip"] }], catalog, { gstRegistered: false });
    expect(q.errors).toEqual([]);
    expect(q.lines[0].unitPriceCents).toBe(1500 + 1500 + 300);
    expect(q.lines[0].lineTotalCents).toBe(6600);
    expect(q.totalCents).toBe(6600);
    expect(q.gstCents).toBe(0);
  });

  it("merges duplicate lines with the same options regardless of order", () => {
    const q = priceCart(
      [
        { menuItemId: "karahi", quantity: 1, choiceIds: ["dip", "full"] },
        { menuItemId: "karahi", quantity: 2, choiceIds: ["full", "dip"] },
      ],
      catalog,
      { gstRegistered: false },
    );
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].quantity).toBe(3);
    expect(q.lines[0].key).toBe(lineKey("karahi", ["full", "dip"]));
  });

  it("requires required groups and enforces max selections", () => {
    expect(priceCart([{ menuItemId: "biryani", quantity: 1, choiceIds: [] }], catalog, { gstRegistered: false }).errors[0].message).toMatch(/spice level/i);
    expect(priceCart([{ menuItemId: "biryani", quantity: 1, choiceIds: ["mild", "hot"] }], catalog, { gstRegistered: false }).errors[0].message).toMatch(/at most 1/);
  });

  it("rejects options from another dish, unavailable options, sold-out and archived dishes", () => {
    const q = priceCart(
      [
        { menuItemId: "biryani", quantity: 1, choiceIds: ["full"] },
        { menuItemId: "karahi", quantity: 1, choiceIds: ["half", "raita"] },
        { menuItemId: "soldout", quantity: 1, choiceIds: [] },
        { menuItemId: "archived", quantity: 1, choiceIds: [] },
        { menuItemId: "missing", quantity: 1, choiceIds: [] },
      ],
      catalog,
      { gstRegistered: false },
    );
    expect(q.lines).toHaveLength(0);
    expect(q.errors.map((e) => e.message)).toEqual([
      expect.stringMatching(/no longer offered/),
      expect.stringMatching(/Raita isn't available/),
      expect.stringMatching(/sold out/),
      expect.stringMatching(/no longer on the menu/),
      expect.stringMatching(/no longer on the menu/),
    ]);
  });

  it("enforces quantity limits and positive integers", () => {
    const q = priceCart(
      [
        { menuItemId: "kheer", quantity: 11, choiceIds: [] },
        { menuItemId: "biryani", quantity: 0, choiceIds: ["mild"] },
        { menuItemId: "biryani", quantity: 1.5, choiceIds: ["hot"] },
      ],
      catalog,
      { gstRegistered: false },
    );
    expect(q.lines).toHaveLength(0);
    expect(q.errors).toHaveLength(3);
  });

  it("calculates GST per line only for taxable items when registered", () => {
    const lines = [
      { menuItemId: "biryani", quantity: 1, choiceIds: ["mild"] },
      { menuItemId: "kheer", quantity: 1, choiceIds: [] },
    ];
    const reg = priceCart(lines, catalog, { gstRegistered: true });
    expect(reg.gstCents).toBe(109); // 1200/11 = 109.09
    expect(reg.totalCents).toBe(2200); // GST-inclusive: total unchanged
    expect(priceCart(lines, catalog, { gstRegistered: false }).gstCents).toBe(0);
  });
});
