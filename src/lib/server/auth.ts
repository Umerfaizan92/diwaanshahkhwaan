import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { can, type Permission, type Role } from "@/lib/domain/permissions";

export const STAFF_COOKIE = "dsk_staff";
export const CUSTOMER_COOKIE = "dsk_customer";
const STAFF_TTL_HOURS = 12;
const CUSTOMER_TTL_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

type Kind = "STAFF" | "CUSTOMER";

async function createSession(kind: Kind, subjectId: string, ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs);
  const [row] = await getDb().insert(schema.sessions).values({ kind, subjectId, expiresAt }).returning();
  const token = await new SignJWT({ sid: row.id, k: kind }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresAt).sign(secret());
  const jar = await cookies();
  jar.set(kind === "STAFF" ? STAFF_COOKIE : CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Verifies the cookie signature AND that the server-side session still exists (so logout/deactivation is immediate) */
async function readSession(kind: Kind): Promise<{ sid: string; subjectId: string } | null> {
  const jar = await cookies();
  const token = jar.get(kind === "STAFF" ? STAFF_COOKIE : CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.k !== kind || typeof payload.sid !== "string") return null;
    const [s] = await getDb()
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.id, payload.sid), eq(schema.sessions.kind, kind), gt(schema.sessions.expiresAt, new Date())))
      .limit(1);
    return s ? { sid: s.id, subjectId: s.subjectId } : null;
  } catch {
    return null;
  }
}

async function destroySession(kind: Kind) {
  const s = await readSession(kind);
  if (s) await getDb().delete(schema.sessions).where(eq(schema.sessions.id, s.sid));
  (await cookies()).delete(kind === "STAFF" ? STAFF_COOKIE : CUSTOMER_COOKIE);
}

/* ---------------- Passwords ---------------- */

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
// Compared against when the account doesn't exist, so response timing doesn't reveal which emails are registered
let dummyHash: Promise<string> | null = null;
export async function verifyPassword(pw: string, hash: string | null | undefined) {
  if (!hash) {
    dummyHash ??= bcrypt.hash("not-a-real-password", 12);
    await bcrypt.compare(pw, await dummyHash);
    return false;
  }
  return bcrypt.compare(pw, hash);
}

/* ---------------- Staff ---------------- */

export type StaffUser = { id: string; email: string; name: string; role: Role };

export const getStaff = cache(async (): Promise<StaffUser | null> => {
  const s = await readSession("STAFF");
  if (!s) return null;
  const [u] = await getDb().select().from(schema.staffUsers).where(eq(schema.staffUsers.id, s.subjectId)).limit(1);
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role };
});

/** For server components/pages: redirects to login when signed out, 403 page when not permitted */
export async function requireStaffPage(permission: Permission): Promise<StaffUser> {
  const u = await getStaff();
  if (!u) redirect("/admin/login");
  if (!can(u.role, permission)) redirect("/admin?denied=1");
  return u;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Please sign in again." : "You don't have permission to do that.");
  }
}

/** For server actions and route handlers: throws instead of redirecting */
export async function requireStaff(permission: Permission): Promise<StaffUser> {
  const u = await getStaff();
  if (!u) throw new AuthError(401);
  if (!can(u.role, permission)) throw new AuthError(403);
  return u;
}

export async function startStaffSession(staffId: string) {
  await createSession("STAFF", staffId, STAFF_TTL_HOURS * 3600_000);
  await getDb().update(schema.staffUsers).set({ lastLoginAt: new Date() }).where(eq(schema.staffUsers.id, staffId));
}
export const endStaffSession = () => destroySession("STAFF");

/** Revoke all sessions for a subject (used on deactivation / password change) */
export async function revokeSessions(subjectId: string) {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.subjectId, subjectId));
}

/* ---------------- Customers ---------------- */

export type CustomerUser = { id: string; email: string; name: string; phone: string };

export const getCustomer = cache(async (): Promise<CustomerUser | null> => {
  const s = await readSession("CUSTOMER");
  if (!s) return null;
  const [c] = await getDb().select().from(schema.customers).where(eq(schema.customers.id, s.subjectId)).limit(1);
  return c ? { id: c.id, email: c.email, name: c.name, phone: c.phone } : null;
});
export const startCustomerSession = (customerId: string) => createSession("CUSTOMER", customerId, CUSTOMER_TTL_DAYS * 86400_000);
export const endCustomerSession = () => destroySession("CUSTOMER");
