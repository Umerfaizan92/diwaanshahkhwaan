"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { startStaffSession, verifyPassword, endStaffSession } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { completeReset, completeSetup, requestResetCode, requestSetupCode, type AccessResult } from "@/lib/server/owner-access";

const schemaIn = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().min(1).max(200) });

export async function staffLogin(_prev: { error?: string; email?: string }, form: FormData): Promise<{ error?: string; email?: string }> {
  const parsed = schemaIn.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your email and password.", email: String(form.get("email") ?? "") };
  const { email, password } = parsed.data;
  const ip = await clientIp();
  const okIp = await rateLimit(`staff-login-ip:${ip}`, 20, 900);
  const okEmail = await rateLimit(`staff-login-email:${email}`, 8, 900);
  if (!okIp || !okEmail) return { error: "Too many sign-in attempts. Wait 15 minutes and try again.", email };

  const [u] = await getDb().select().from(schema.staffUsers).where(eq(schema.staffUsers.email, email)).limit(1);
  const valid = await verifyPassword(password, u?.passwordHash);
  if (!u || !valid || !u.active || u.role !== "OWNER") {
    await audit(null, "staff.login_failed", "staff_user", u?.id ?? null, { email, ip });
    return { error: "That email and password don't match the owner account.", email };
  }
  await startStaffSession(u.id);
  await audit({ id: u.id, email: u.email }, "staff.login", "staff_user", u.id, { ip });
  redirect("/admin");
}

export async function staffLogout() {
  await endStaffSession();
  redirect("/admin/login");
}

/* ---------------- Owner setup and password reset ---------------- */


const slow = "Too many attempts. Wait 15 minutes and try again.";

export async function ownerSetupRequestAction(input: { name: string; email: string; phone: string }): Promise<AccessResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`owner-code-ip:${ip}`, 5, 900))) return { ok: false, error: slow };
  if (!(await rateLimit(`owner-code-email:${String(input.email).toLowerCase()}`, 3, 900))) return { ok: false, error: slow };
  return requestSetupCode(input);
}

export async function ownerSetupCompleteAction(input: { email: string; code: string; password: string; confirm: string }): Promise<AccessResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`owner-verify-ip:${ip}`, 15, 900))) return { ok: false, error: slow };
  const r = await completeSetup({ ...input, email: String(input.email).toLowerCase().trim() });
  if (!r.ok || !r.staffId) return r;
  await startStaffSession(r.staffId);
  redirect("/admin");
}

export async function ownerResetRequestAction(input: { email: string }): Promise<AccessResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`owner-code-ip:${ip}`, 5, 900))) return { ok: false, error: slow };
  if (!(await rateLimit(`owner-code-email:${String(input.email).toLowerCase()}`, 3, 900))) return { ok: false, error: slow };
  return requestResetCode({ email: String(input.email).toLowerCase().trim() });
}

export async function ownerResetCompleteAction(input: { email: string; code: string; password: string; confirm: string }): Promise<AccessResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`owner-verify-ip:${ip}`, 15, 900))) return { ok: false, error: slow };
  return completeReset({ ...input, email: String(input.email).toLowerCase().trim() });
}
