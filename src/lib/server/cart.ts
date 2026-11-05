import "server-only";
import { getDb, type DbOrTx } from "@/lib/db";
import { priceCart, type CartLineInput, type GstOptions, type Quote } from "@/lib/domain/pricing";
import { loadCatalog } from "./catalog";
import { getSettings } from "./settings";

/** Authoritative server-side quote for a cart */
export async function quoteCart(lines: CartLineInput[], db: DbOrTx = getDb(), gst?: GstOptions | boolean): Promise<Quote> {
  const catalog = await loadCatalog(db, lines.map((l) => l.menuItemId));
  let opts: GstOptions;
  if (typeof gst === "boolean") opts = { gstRegistered: gst };
  else if (gst) opts = gst;
  else {
    const s = await getSettings();
    opts = { gstRegistered: s.gstRegistered, gstMode: s.gstMode };
  }
  return priceCart(lines, catalog, opts);
}
