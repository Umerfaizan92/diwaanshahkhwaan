import "server-only";
import { getDb, type DbOrTx } from "@/lib/db";
import { priceCart, type CartLineInput, type Quote } from "@/lib/domain/pricing";
import { loadCatalog } from "./catalog";
import { getSettings } from "./settings";

/** Authoritative server-side quote for a cart */
export async function quoteCart(lines: CartLineInput[], db: DbOrTx = getDb(), gstRegistered?: boolean): Promise<Quote> {
  const catalog = await loadCatalog(db, lines.map((l) => l.menuItemId));
  const gst = gstRegistered ?? (await getSettings()).gstRegistered;
  return priceCart(lines, catalog, { gstRegistered: gst });
}
