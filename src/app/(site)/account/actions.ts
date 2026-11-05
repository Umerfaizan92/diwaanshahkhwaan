"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { endCustomerSession, getCustomer, hashPassword, startCustomerSession, verifyPassword } from "@/lib/server/auth";
import { auPhone, email, fieldErrors, personName } from "@/lib/domain/validation";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export type AccountState = { error?: string; errors?: Record<string, string>; values?: Record<string, string> };

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
};

const registerSchema = z.object({
  name: personName,
  email,
  phone: auPhone,
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function registerCustomer(_p: AccountState, form: FormData): Promise<AccountState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") };
  const parsed = registerSchema.safeParse({ ...values, password: String(form.get("password") ?? "") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 3600))) return { error: "Too many attempts. Try again later.", values };
  const db = getDb();
  const [existing] = await db.select().from(schema.customers).where(eq(schema.customers.email, parsed.data.email));
  if (existing?.passwordHash) return { errors: { email: "There's already an account for this email. Sign in instead." }, values };
  const passwordHash = await hashPassword(parsed.data.password);
  let id = existing?.id;
  if (existing) {
    // A customer row may exist from staff notes; claiming it requires setting a password now
    await db.update(schema.customers).set({ name: parsed.data.name, phone: parsed.data.phone, passwordHash }).where(eq(schema.customers.id, existing.id));
  } else {
    [{ id }] = await db.insert(schema.customers).values({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, passwordHash }).returning({ id: schema.customers.id });
  }
  await startCustomerSession(id!);
  redirect(safeNext(form.get("next")));
}

export async function loginCustomer(_p: AccountState, form: FormData): Promise<AccountState> {
  const em = String(form.get("email") ?? "").trim().toLowerCase();
  const pw = String(form.get("password") ?? "");
  if (!em || !pw) return { error: "Enter your email and password.", values: { email: em } };
  const ip = await clientIp();
  if (!(await rateLimit(`cust-login-ip:${ip}`, 20, 900)) || !(await rateLimit(`cust-login:${em}`, 8, 900))) return { error: "Too many sign-in attempts. Wait 15 minutes and try again.", values: { email: em } };
  const [c] = await getDb().select().from(schema.customers).where(eq(schema.customers.email, em));
  if (!(await verifyPassword(pw, c?.passwordHash)) || !c) return { error: "That email and password don't match an account.", values: { email: em } };
  await startCustomerSession(c.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutCustomer() {
  await endCustomerSession();
  redirect("/account");
}

export async function updateCustomer(_p: AccountState, form: FormData): Promise<AccountState> {
  const me = await getCustomer();
  if (!me) redirect("/account");
  const values = { name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? "") };
  const parsed = z.object({ name: personName, phone: auPhone }).safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await getDb().update(schema.customers).set(parsed.data).where(eq(schema.customers.id, me.id));
  return { values, error: undefined, errors: { _ok: "Details saved" } };
}
