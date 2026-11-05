const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const AUD_WHOLE = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

/** 1250 -> "$12.50" */
export function formatCents(cents: number): string {
  return AUD.format(cents / 100);
}
/** 1200 -> "$12", 1250 -> "$12.50" */
export function formatCentsShort(cents: number): string {
  return cents % 100 === 0 ? AUD_WHOLE.format(cents / 100) : AUD.format(cents / 100);
}
/** "12.50" -> 1250. Returns null for invalid input. */
export function parseDollarsToCents(input: string): number | null {
  const t = input.trim().replace(/^\$/, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  const [d, c = ""] = t.split(".");
  return Number(d) * 100 + Number((c + "00").slice(0, 2));
}
/** GST component of a GST-inclusive amount (1/11), rounded to the nearest cent */
export function gstFromInclusive(cents: number): number {
  return Math.round(cents / 11);
}
