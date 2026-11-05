"use server";

import { getDb, schema } from "@/lib/db";
import { contactSchema, fieldErrors } from "@/lib/domain/validation";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export type ContactState = { ok: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

const TOPIC_LABEL: Record<string, string> = { general: "General", bulk: "Bulk / BBQ order", order: "Existing order", allergy: "Allergy question" };

export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(["name", "email", "phone", "topic", "message", "website"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };
  // Honeypot filled: pretend success, store nothing
  if (parsed.data.website) return { ok: true, message: "Thanks — we'll be in touch soon." };

  const ip = await clientIp();
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) {
    return { ok: false, message: "Too many messages from this connection. Please call us instead.", values: raw };
  }

  const d = parsed.data;
  await getDb()
    .insert(schema.contactMessages)
    .values({ name: d.name, email: d.email, phone: d.phone || null, message: `[${TOPIC_LABEL[d.topic]}] ${d.message}` });

  return { ok: true, message: "Thanks — your message is with us. We'll reply as soon as we can." };
}
