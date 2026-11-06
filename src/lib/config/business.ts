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
  /** Private: only shown on paid/confirmed orders, receipts and confirmation emails */
  pickupAddress: "25 Osten Dr, Langford WA 6147",
  pickupInstructions:
    "Please arrive within your pickup time, and call us if you are running late.",
  timezone: "Australia/Perth",
  currency: "AUD",
  contacts: [
    { name: "Sayed Hasnain Shah", phone: "0452 401 786", role: "Orders, enquiries & pickup" },
  ] as { name: string | null; phone: string; role: string }[],
} as const;

/** "0452 401 786" -> "tel:+61452401786" */
/** sms: link that opens the phone's messaging app, optionally with a pre-filled message */
export function toSmsHref(phone: string, body?: string): string {
  const tel = toTelHref(phone).slice(4);
  return `sms:${tel}${body ? `?&body=${encodeURIComponent(body)}` : ""}`;
}

export function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("61")) return `tel:+${digits}`;
  return `tel:+61${digits.startsWith("0") ? digits.slice(1) : digits}`;
}
