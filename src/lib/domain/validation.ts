import { z } from "zod";

/** Normalises Australian mobile/landline numbers to "04xx xxx xxx" / "0x xxxx xxxx" display form */
export function normaliseAuPhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+61")) d = "0" + d.slice(3);
  else if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  d = d.replace(/\D/g, "");
  if (/^04\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (/^0[2378]\d{8}$/.test(d)) return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  return null;
}

export const auPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normaliseAuPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter an Australian phone number, e.g. 0412 345 678" });
      return z.NEVER;
    }
    return n;
  });

export const email = z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email address" })).pipe(z.string().max(200));
export const personName = z.string().trim().min(2, "Enter your name").max(80, "Name is too long");

export const contactSchema = z.object({
  name: personName,
  email,
  phone: z.union([z.literal(""), auPhone]).optional(),
  topic: z.enum(["general", "bulk", "order", "allergy"]).default("general"),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000, "Message is too long (2000 max)"),
  /** honeypot: must stay empty */
  website: z.string().max(0).optional(),
});

/** Flattens Zod errors into { field: message } */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
