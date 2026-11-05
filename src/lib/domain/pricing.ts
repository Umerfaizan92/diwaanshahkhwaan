import { gstFromInclusive } from "./money";

/** What the browser is allowed to send: identifiers and quantities only. Never prices. */
export type CartLineInput = { menuItemId: string; quantity: number; choiceIds: string[] };

export type CatalogChoice = { id: string; name: string; priceDeltaCents: number; isAvailable: boolean };
export type CatalogGroup = { id: string; name: string; required: boolean; minSelect: number; maxSelect: number; choices: CatalogChoice[] };
export type CatalogItem = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  isArchived: boolean;
  maxPerOrder: number;
  gstTreatment: "TAXABLE" | "GST_FREE";
  optionGroups: CatalogGroup[];
};

export type PricedLine = {
  key: string;
  menuItemId: string;
  name: string;
  quantity: number;
  choiceIds: string[];
  options: { group: string; choice: string; priceDeltaCents: number }[];
  unitPriceCents: number;
  lineTotalCents: number;
  gstTreatment: "TAXABLE" | "GST_FREE";
  gstCents: number;
};

export type LineError = { key: string; menuItemId: string; message: string };

export type Quote = {
  lines: PricedLine[];
  errors: LineError[];
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  itemCount: number;
};

export const MAX_LINES = 40;
export const MAX_ORDER_ITEMS = 200;

export function lineKey(menuItemId: string, choiceIds: string[]): string {
  return [menuItemId, ...[...choiceIds].sort()].join("|");
}

/**
 * Re-prices a cart from the authoritative catalogue. Invalid lines are dropped and reported,
 * never silently "fixed" into something the customer didn't choose.
 * Prices are GST-inclusive; GST is only reported when the business is registered.
 */
export function priceCart(input: CartLineInput[], catalog: Map<string, CatalogItem>, opts: { gstRegistered: boolean }): Quote {
  const errors: LineError[] = [];
  const merged = new Map<string, CartLineInput>();

  for (const raw of input.slice(0, MAX_LINES)) {
    const choiceIds = Array.from(new Set(raw.choiceIds ?? []));
    const key = lineKey(raw.menuItemId, choiceIds);
    const prev = merged.get(key);
    merged.set(key, { menuItemId: raw.menuItemId, choiceIds, quantity: (prev?.quantity ?? 0) + raw.quantity });
  }
  if (input.length > MAX_LINES) errors.push({ key: "_cart", menuItemId: "", message: `A cart can hold up to ${MAX_LINES} different items.` });

  const lines: PricedLine[] = [];
  for (const [key, l] of merged) {
    const item = catalog.get(l.menuItemId);
    const fail = (message: string) => errors.push({ key, menuItemId: l.menuItemId, message });
    if (!item || item.isArchived) {
      fail("This dish is no longer on the menu.");
      continue;
    }
    if (!item.isAvailable) {
      fail(`${item.name} is sold out.`);
      continue;
    }
    if (!Number.isInteger(l.quantity) || l.quantity < 1) {
      fail(`Choose a quantity for ${item.name}.`);
      continue;
    }
    if (l.quantity > item.maxPerOrder) {
      fail(`You can order up to ${item.maxPerOrder} × ${item.name}.`);
      continue;
    }

    const choiceToGroup = new Map<string, { g: CatalogGroup; c: CatalogChoice }>();
    for (const g of item.optionGroups) for (const c of g.choices) choiceToGroup.set(c.id, { g, c });

    let invalid = false;
    const chosen: { g: CatalogGroup; c: CatalogChoice }[] = [];
    for (const id of l.choiceIds) {
      const hit = choiceToGroup.get(id);
      if (!hit) {
        fail(`One of the options for ${item.name} is no longer offered.`);
        invalid = true;
        break;
      }
      if (!hit.c.isAvailable) {
        fail(`${hit.c.name} isn't available for ${item.name} right now.`);
        invalid = true;
        break;
      }
      chosen.push(hit);
    }
    if (invalid) continue;

    for (const g of item.optionGroups) {
      const n = chosen.filter((x) => x.g.id === g.id).length;
      const min = Math.max(g.minSelect, g.required ? 1 : 0);
      if (n < min) {
        fail(`Choose ${g.name.toLowerCase()} for ${item.name}.`);
        invalid = true;
        break;
      }
      if (n > g.maxSelect) {
        fail(`Choose at most ${g.maxSelect} for ${g.name.toLowerCase()} (${item.name}).`);
        invalid = true;
        break;
      }
    }
    if (invalid) continue;

    // Stable, menu-defined option order
    const order = new Map<string, number>();
    item.optionGroups.forEach((g, gi) => g.choices.forEach((c, ci) => order.set(c.id, gi * 1000 + ci)));
    chosen.sort((a, b) => (order.get(a.c.id) ?? 0) - (order.get(b.c.id) ?? 0));

    const unit = item.priceCents + chosen.reduce((s, x) => s + x.c.priceDeltaCents, 0);
    if (unit < 0) {
      fail(`${item.name} can't be priced with those options.`);
      continue;
    }
    const lineTotal = unit * l.quantity;
    const taxable = opts.gstRegistered && item.gstTreatment === "TAXABLE";
    lines.push({
      key,
      menuItemId: item.id,
      name: item.name,
      quantity: l.quantity,
      choiceIds: chosen.map((x) => x.c.id),
      options: chosen.map((x) => ({ group: x.g.name, choice: x.c.name, priceDeltaCents: x.c.priceDeltaCents })),
      unitPriceCents: unit,
      lineTotalCents: lineTotal,
      gstTreatment: item.gstTreatment,
      gstCents: taxable ? gstFromInclusive(lineTotal) : 0,
    });
  }

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  if (itemCount > MAX_ORDER_ITEMS) {
    errors.push({ key: "_cart", menuItemId: "", message: `Online orders are limited to ${MAX_ORDER_ITEMS} items. For bigger orders, please contact us.` });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const gst = lines.reduce((s, l) => s + l.gstCents, 0);
  return { lines, errors, subtotalCents: subtotal, gstCents: gst, totalCents: subtotal, itemCount };
}
