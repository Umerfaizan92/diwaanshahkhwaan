import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DB } from "@/lib/db";
import { email as emailSchema, normaliseAuPhone, personName } from "@/lib/domain/validation";
import { hashPassword, revokeSessions } from "./auth";
import { audit } from "./audit";
import { getEmailSender, getSmsSender } from "./messaging";

/**
 * Owner access without anyone else's help:
 *  - First-time setup, only while no owner exists. The mobile number must be the business's own
 *    number on record, and a 6-digit code is sent to that mobile and to the email given.
 *  - Forgot password: a 6-digit code is sent to the owner's email and the owner's mobile.
 * Codes expire after 10 minutes, allow 5 attempts, are single-use and stored only as an HMAC.
 * Responses never reveal whether an email belongs to the owner.
 */

export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MIN_PASSWORD = 12;

export type AccessResult = { ok: true; message: string; masked?: { email: string | null; phone: string | null } } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`)
  .max(200)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Use letters and at least one number");

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set");
  return s;
}
const hashCode = (id: string, code: string) => createHmac("sha256", secret()).update(`${id}:${code}`).digest("hex");
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
const digits = (p: string | null | undefined) => (p ? (normaliseAuPhone(p) ?? "").replace(/\D/g, "") : "");

export const maskEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(6, Math.max(2, b.length))) + c);
export const maskPhone = (p: string) => p.replace(/\d(?=(?:\D*\d){3})/g, "•");

export async function ownerExists(db: DB = getDb()): Promise<boolean> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.staffUsers).where(and(eq(schema.staffUsers.role, "OWNER"), eq(schema.staffUsers.active, true)));
  return r.n > 0;
}

/** The business mobile on record: where setup codes and reset codes are texted */
async function ownerPhoneOnRecord(db: DB): Promise<string | null> {
  const [s] = await db.select().from(schema.businessSettings).limit(1);
  return s?.ownerNotifyPhone || s?.contacts?.[0]?.phone || null;
}

async function deliver(code: string, to: { email?: string | null; phone?: string | null }, purpose: "SETUP" | "RESET", key: string) {
  const what = purpose === "SETUP" ? "set up your owner account" : "reset your owner password";
  const text = `Your Diwaan Shah Khwaan code to ${what} is ${code}. It expires in ${CODE_MINUTES} minutes. If you didn't ask for this, ignore this message and nobody can use it.`;
  const email = getEmailSender();
  const sms = getSmsSender();
  const results: string[] = [];
  if (to.email) {
    const r = await email.send({
      to: to.email,
      subject: `${code} is your Diwaan Shah Khwaan verification code`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#2a1d14"><h1 style="font-family:Georgia,serif;font-size:22px">Your verification code</h1><p>Use this code to ${what}:</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:16px 0">${code}</p><p style="color:#6d5a45">It expires in ${CODE_MINUTES} minutes and can only be used once. If you didn't ask for this, you can ignore this email.</p></div>`,
      text,
      idempotencyKey: `${key}:email`,
    });
    if (r.ok) results.push("email");
  }
  if (to.phone) {
    const r = await sms.send({ to: to.phone, body: text, idempotencyKey: `${key}:sms` });
    if (r.ok) results.push("sms");
  }
  // Before an email or SMS provider is connected, the code is written to the private server log
  // (Render → Logs), which only the site's administrator can read. It is never shown in the browser.
  if (!email.configured && !sms.configured) console.info(`[owner-code] purpose=${purpose} code=${code} (no email/SMS provider configured yet)`);
  return results;
}

async function storeCode(db: DB, v: { purpose: "SETUP" | "RESET"; email: string; name?: string | null; phone?: string | null; staffId?: string | null }) {
  // A new code replaces any earlier unused one
  await db
    .update(schema.ownerCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.ownerCodes.email, v.email), eq(schema.ownerCodes.purpose, v.purpose), isNull(schema.ownerCodes.usedAt)));
  const code = newCode();
  const id = crypto.randomUUID();
  await db.insert(schema.ownerCodes).values({ id, ...v, codeHash: hashCode(id, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) });
  return { id, code };
}

async function checkCode(db: DB, purpose: "SETUP" | "RESET", email: string, code: string) {
  const rows = await db
    .select()
    .from(schema.ownerCodes)
    .where(and(eq(schema.ownerCodes.email, email), eq(schema.ownerCodes.purpose, purpose), isNull(schema.ownerCodes.usedAt)))
    .orderBy(sql`${schema.ownerCodes.createdAt} desc`)
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt <= new Date()) return { ok: false as const, error: "That code has expired. Request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many wrong codes. Request a new one." };
  if (!/^\d{6}$/.test(code) || !sameHash(row.codeHash, hashCode(row.id, code))) {
    await db.update(schema.ownerCodes).set({ attempts: sql`${schema.ownerCodes.attempts} + 1` }).where(eq(schema.ownerCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false as const, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Request a new one." };
  }
  // Single use: only one request can claim it
  const claimed = await db.update(schema.ownerCodes).set({ usedAt: new Date() }).where(and(eq(schema.ownerCodes.id, row.id), isNull(schema.ownerCodes.usedAt))).returning({ id: schema.ownerCodes.id });
  if (!claimed.length) return { ok: false as const, error: "That code has already been used. Request a new one." };
  return { ok: true as const, row };
}

/* ---------------- First-time setup ---------------- */

const setupRequest = z.object({ name: personName, email: emailSchema, phone: z.string().trim().max(30) });

export async function requestSetupCode(raw: unknown, db: DB = getDb()): Promise<AccessResult> {
  const p = setupRequest.safeParse(raw);
  if (!p.success) return { ok: false, error: "Check your details", fieldErrors: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  if (await ownerExists(db)) return { ok: false, error: "The owner account is already set up. Sign in, or use “Forgot password”." };
  const onRecord = await ownerPhoneOnRecord(db);
  if (!onRecord || digits(p.data.phone) !== digits(onRecord)) {
    return { ok: false, error: "For security, use the business mobile number on record.", fieldErrors: { phone: "This must be the business mobile number on record" } };
  }
  const phone = normaliseAuPhone(onRecord)!;
  const { id, code } = await storeCode(db, { purpose: "SETUP", email: p.data.email, name: p.data.name, phone });
  await deliver(code, { email: p.data.email, phone }, "SETUP", id);
  await audit(null, "owner.setup_code_sent", "owner_codes", id, { email: p.data.email }, db);
  return { ok: true, message: "We've sent a 6-digit code to your mobile and email.", masked: { email: maskEmail(p.data.email), phone: maskPhone(phone) } };
}

const setupComplete = z.object({ email: emailSchema, code: z.string().trim(), password: z.string(), confirm: z.string() });

export async function completeSetup(raw: unknown, db: DB = getDb()): Promise<AccessResult & { staffId?: string }> {
  const p = setupComplete.safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the form" };
  const pw = passwordSchema.safeParse(p.data.password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message, fieldErrors: { password: pw.error.issues[0].message } };
  if (p.data.password !== p.data.confirm) return { ok: false, error: "The passwords don't match", fieldErrors: { confirm: "Doesn't match" } };
  const hash = await hashPassword(p.data.password);
  return db.transaction(async (tx) => {
    // Serialise setups so two people can never both become "the first owner"
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('owner-setup'))`);
    if (await ownerExists(tx as unknown as DB)) return { ok: false as const, error: "The owner account is already set up. Sign in instead." };
    const c = await checkCode(tx as unknown as DB, "SETUP", p.data.email, p.data.code);
    if (!c.ok) return c;
    const [u] = await tx
      .insert(schema.staffUsers)
      .values({ email: p.data.email, name: c.row.name ?? "Owner", passwordHash: hash, role: "OWNER", active: true })
      .onConflictDoUpdate({ target: schema.staffUsers.email, set: { passwordHash: hash, role: "OWNER", active: true } })
      .returning();
    await tx.update(schema.businessSettings).set({ ownerNotifyEmail: sql`coalesce(${schema.businessSettings.ownerNotifyEmail}, ${p.data.email})` });
    await audit({ id: u.id, email: u.email }, "owner.setup_complete", "staff_user", u.id, {}, tx as unknown as DB);
    return { ok: true as const, message: "Your owner account is ready.", staffId: u.id };
  });
}

/* ---------------- Forgot password ---------------- */

const GENERIC = "If that email belongs to the owner account, we've sent a 6-digit code to the owner's email and mobile.";

export async function requestResetCode(raw: unknown, db: DB = getDb()): Promise<AccessResult> {
  const p = z.object({ email: emailSchema }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Enter your email address", fieldErrors: { email: "Enter your email address" } };
  const [u] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, p.data.email)).limit(1);
  if (!u || !u.active || u.role !== "OWNER") {
    await audit(null, "owner.reset_unknown_email", "staff_user", null, { email: p.data.email }, db);
    return { ok: true, message: GENERIC }; // same answer either way: no account discovery
  }
  const phone = normaliseAuPhone((await ownerPhoneOnRecord(db)) ?? "") ?? null;
  const { id, code } = await storeCode(db, { purpose: "RESET", email: u.email, staffId: u.id, phone });
  await deliver(code, { email: u.email, phone }, "RESET", id);
  await audit({ id: u.id, email: u.email }, "owner.reset_code_sent", "staff_user", u.id, {}, db);
  return { ok: true, message: GENERIC };
}

const resetComplete = z.object({ email: emailSchema, code: z.string().trim(), password: z.string(), confirm: z.string() });

export async function completeReset(raw: unknown, db: DB = getDb()): Promise<AccessResult & { staffId?: string }> {
  const p = resetComplete.safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the form" };
  const pw = passwordSchema.safeParse(p.data.password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message, fieldErrors: { password: pw.error.issues[0].message } };
  if (p.data.password !== p.data.confirm) return { ok: false, error: "The passwords don't match", fieldErrors: { confirm: "Doesn't match" } };
  const c = await checkCode(db, "RESET", p.data.email, p.data.code);
  if (!c.ok) return c;
  const [u] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, p.data.email)).limit(1);
  if (!u || !u.active || u.role !== "OWNER" || u.id !== c.row.staffId) return { ok: false, error: "That code has expired. Request a new one." };
  await db.update(schema.staffUsers).set({ passwordHash: await hashPassword(p.data.password) }).where(eq(schema.staffUsers.id, u.id));
  await revokeSessions(u.id); // sign out every device
  await audit({ id: u.id, email: u.email }, "owner.password_reset", "staff_user", u.id, {}, db);
  // Tell the owner straight away, in case it wasn't them
  const note = "Your Diwaan Shah Khwaan owner password was just changed. If this wasn't you, call your website manager straight away.";
  await getEmailSender().send({ to: u.email, subject: "Your owner password was changed", html: `<p style="font-family:Helvetica,Arial,sans-serif">${note}</p>`, text: note, idempotencyKey: `pwchanged:${c.row.id}:email` });
  if (c.row.phone) await getSmsSender().send({ to: c.row.phone, body: note, idempotencyKey: `pwchanged:${c.row.id}:sms` });
  return { ok: true, message: "Your password has been changed. Sign in with your new password.", staffId: u.id };
}
