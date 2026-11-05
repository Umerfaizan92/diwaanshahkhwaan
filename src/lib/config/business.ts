/**
 * Default business identity used to seed business_settings and as a fallback.
 * The live values are edited by the owner in Admin → Settings.
 * Anything marked VERIFY must be confirmed by the owner before launch.
 */
export const BUSINESS_DEFAULTS = {
  businessName: "Diwaan Shah Khwaan",
  shortName: "DSK",
  tagline: "Taste the Royalty",
  strapline: "Royal flavours served with love",
  pickupArea: "Langford WA 6147",
  pickupInstructions:
    "Pickup only, from our home kitchen in the Langford area. The exact pickup address is sent with your paid order confirmation.",
  timezone: "Australia/Perth",
  currency: "AUD",
  contacts: [
    { name: "Sayed Hasnain Shah", phone: "0452 401 786", role: "Orders, enquiries & pickup" },
    { name: null, phone: "0469 975 901", role: "Orders & enquiries" }, // VERIFY: contact name
  ] as { name: string | null; phone: string; role: string }[],
} as const;

/** "0452 401 786" -> "tel:+61452401786" */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("61")) return `tel:+${digits}`;
  return `tel:+61${digits.startsWith("0") ? digits.slice(1) : digits}`;
}
