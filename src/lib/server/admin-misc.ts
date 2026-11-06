import "server-only";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";
import { getDb, schema, type DB } from "@/lib/db";
import { auPhone, email, personName } from "@/lib/domain/validation";
import { hashPassword, revokeSessions, type StaffUser } from "./auth";
import { audit } from "./audit";
import type { ActionResult } from "./action";

function zErr(e: z.ZodError): ActionResult<never> {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[i.path.join(".")] ??= i.message;
  return { ok: false, error: e.issues[0]?.message ?? "Check the form", fieldErrors: fe };
}

/* ---------------- Business settings ---------------- */

const abn = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v === "" || isValidAbn(v), "That ABN doesn't pass the ABN checksum")
  .transform((v) => (v ? `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5, 8)} ${v.slice(8)}` : null));

/** ATO ABN checksum */
export function isValidAbn(v: string): boolean {
  if (!/^\d{11}$/.test(v)) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const d = v.split("").map(Number);
  d[0] -= 1;
  return d.reduce((s, x, i) => s + x * w[i], 0) % 89 === 0;
}

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  legalName: z.string().trim().max(150).nullable(),
  tagline: z.string().trim().max(120),
  abn,
  email: z.union([z.literal(""), email]).transform((v) => v || null),
  contacts: z.array(z.object({ name: z.string().trim().max(80).nullable(), phone: auPhone, role: z.string().trim().max(60) })).min(1, "Add at least one phone number").max(5),
  pickupArea: z.string().trim().min(2).max(120),
  pickupAddress: z.string().trim().max(300).nullable(),
  pickupInstructions: z.string().trim().max(500).nullable(),
  announcement: z.string().trim().max(200).nullable(),
  gstRegistered: z.boolean(),
  gstMode: z.enum(["INCLUSIVE", "ADD_ON"]),
  acceptCash: z.boolean(),
  acceptCard: z.boolean(),
  halalCertified: z.boolean(),
  halalCertifier: z.string().trim().max(120).transform((v) => v || null),
  halalCertNumber: z.string().trim().max(60).transform((v) => v || null),
});

export async function saveSettings(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  if (!p.data.acceptCash && !p.data.acceptCard) return { ok: false, error: "Keep at least one payment method switched on", fieldErrors: { acceptCard: "Choose at least one" } };
  if (p.data.gstRegistered && !p.data.abn) return { ok: false, error: "Add your ABN before switching on GST registration", fieldErrors: { abn: "Required when GST registered" } };
  const [before] = await db.select().from(schema.businessSettings);
  await db.update(schema.businessSettings).set({ ...p.data, contacts: p.data.contacts.map((c) => ({ ...c, name: c.name || null })) }).where(eq(schema.businessSettings.id, 1));
  const changed = Object.keys(p.data).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((p.data as Record<string, unknown>)[k]));
  await audit(actor, "settings.update", "business_settings", "1", { changed }, db);
  return { ok: true, message: "Settings saved" };
}

export const notifySchema = z.object({
  notifyEmailEnabled: z.boolean(),
  notifySmsEnabled: z.boolean(),
  notifyOwnerNewOrder: z.boolean(),
  ownerNotifyEmail: z.union([z.literal(""), email]).transform((v) => v || null),
  ownerNotifyPhone: z.union([z.literal(""), auPhone]).transform((v) => v || null),
  notifyOwnerSms: z.boolean(),
  reminderHoursBefore: z.number().int().min(0).max(48),
});

export async function saveNotificationSettings(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = notifySchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  await db.update(schema.businessSettings).set(p.data).where(eq(schema.businessSettings.id, 1));
  await audit(actor, "settings.notifications", "business_settings", "1", p.data, db);
  return { ok: true, message: "Notification settings saved" };
}

/* ---------------- Staff ---------------- */

const password = z.string().min(12, "Use at least 12 characters").max(200);
// Only owner logins can be created: the dashboard is for the business owner only
export const newStaffSchema = z.object({ name: personName, email, role: z.literal("OWNER"), password });

async function ownerCount(db: DB, exceptId?: string) {
  const [r] = await db
    .select({ n: count() })
    .from(schema.staffUsers)
    .where(and(eq(schema.staffUsers.role, "OWNER"), eq(schema.staffUsers.active, true), exceptId ? ne(schema.staffUsers.id, exceptId) : undefined));
  return r.n;
}

export async function createStaff(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = newStaffSchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  const [exists] = await db.select({ id: schema.staffUsers.id }).from(schema.staffUsers).where(eq(schema.staffUsers.email, p.data.email));
  if (exists) return { ok: false, error: "There's already a staff account with that email", fieldErrors: { email: "Already exists" } };
  const [u] = await db.insert(schema.staffUsers).values({ name: p.data.name, email: p.data.email, role: p.data.role, passwordHash: await hashPassword(p.data.password) }).returning();
  await audit(actor, "staff.create", "staff_user", u.id, { email: u.email, role: u.role }, db);
  return { ok: true, message: `${u.name} can now sign in` };
}

export async function updateStaff(actor: StaffUser, id: string, patch: { role?: string; active?: boolean; password?: string }, db: DB = getDb()): Promise<ActionResult> {
  const [u] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.id, id));
  if (!u) return { ok: false, error: "Staff member not found" };
  const set: Partial<typeof schema.staffUsers.$inferInsert> = {};
  if (patch.role !== undefined) {
    const r = z.literal("OWNER").safeParse(patch.role);
    if (!r.success) return { ok: false, error: "Unknown role" };
    if (u.role === "OWNER" && r.data !== "OWNER" && (await ownerCount(db, u.id)) === 0) return { ok: false, error: "There must always be at least one active owner." };
    set.role = r.data;
  }
  if (patch.active !== undefined) {
    if (id === actor.id && !patch.active) return { ok: false, error: "You can't deactivate your own account." };
    if (!patch.active && u.role === "OWNER" && (await ownerCount(db, u.id)) === 0) return { ok: false, error: "There must always be at least one active owner." };
    set.active = patch.active;
  }
  if (patch.password !== undefined) {
    const pw = password.safeParse(patch.password);
    if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
    set.passwordHash = await hashPassword(pw.data);
  }
  await db.update(schema.staffUsers).set(set).where(eq(schema.staffUsers.id, id));
  // Role, status and password changes take effect immediately
  if (set.active === false || set.passwordHash || set.role) await revokeSessions(id);
  await audit(actor, "staff.update", "staff_user", id, { email: u.email, role: set.role, active: set.active, passwordReset: !!set.passwordHash }, db);
  return { ok: true, message: "Staff member updated" };
}

/* ---------------- Customers ---------------- */

export async function customerList(q: string, db: DB = getDb()) {
  // Paid orders, plus live cash-at-pickup orders, count towards a customer's history
  const where = and(sql`(${schema.orders.paidAt} is not null or (${schema.orders.paymentMethod} = 'CASH' and ${schema.orders.status} not in ('CANCELLED','EXPIRED','REFUNDED')))`, q ? or(ilike(schema.orders.customerName, `%${q}%`), ilike(schema.orders.customerEmail, `%${q}%`), ilike(schema.orders.customerPhone, `%${q}%`)) : undefined);
  return db
    .select({
      email: schema.orders.customerEmail,
      name: sql<string>`(array_agg(${schema.orders.customerName} order by ${schema.orders.createdAt} desc))[1]`,
      phone: sql<string>`(array_agg(${schema.orders.customerPhone} order by ${schema.orders.createdAt} desc))[1]`,
      orders: sql<number>`count(*)::int`,
      spent: sql<number>`sum(${schema.orders.totalCents} - ${schema.orders.refundedCents})::int`,
      last: sql<string>`max(${schema.orders.pickupDate})`,
      hasAccount: sql<boolean>`bool_or(${schema.orders.customerId} is not null)`,
    })
    .from(schema.orders)
    .where(where)
    .groupBy(schema.orders.customerEmail)
    .orderBy(desc(sql`max(${schema.orders.createdAt})`))
    .limit(300);
}

export async function customerDetail(emailAddr: string, db: DB = getDb()) {
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.customerEmail, emailAddr)).orderBy(desc(schema.orders.createdAt)).limit(200);
  const [account] = await db.select().from(schema.customers).where(eq(schema.customers.email, emailAddr));
  return { orders, account };
}

export async function saveCustomerNote(actor: StaffUser, emailAddr: string, notes: string, db: DB = getDb()): Promise<ActionResult> {
  const e = email.safeParse(emailAddr);
  if (!e.success || notes.length > 2000) return { ok: false, error: "Invalid note" };
  const [latest] = await db.select().from(schema.orders).where(eq(schema.orders.customerEmail, e.data)).orderBy(desc(schema.orders.createdAt)).limit(1);
  await db
    .insert(schema.customers)
    .values({ email: e.data, name: latest?.customerName ?? e.data, phone: latest?.customerPhone ?? "", notes })
    .onConflictDoUpdate({ target: schema.customers.email, set: { notes } });
  await audit(actor, "customer.note", "customer", e.data, {}, db);
  return { ok: true, message: "Note saved" };
}

/* ---------------- Messages ---------------- */

export async function setMessageHandled(actor: StaffUser, id: string, handled: boolean, db: DB = getDb()): Promise<ActionResult> {
  const [m] = await db.update(schema.contactMessages).set({ handled }).where(eq(schema.contactMessages.id, id)).returning();
  if (!m) return { ok: false, error: "Message not found" };
  await audit(actor, handled ? "message.handled" : "message.reopened", "contact_message", id, {}, db);
  return { ok: true };
}

/* ---------------- Media (food photography) ---------------- */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Validates by decoding (not by extension), strips metadata, resizes and re-encodes to WebP */
export async function uploadMedia(actor: StaffUser, file: File, alt: string, db: DB = getDb()): Promise<ActionResult<{ id: string }>> {
  if (!file || typeof file.arrayBuffer !== "function") return { ok: false, error: "Choose a photo to upload" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Photos must be under 8 MB" };
  if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"].includes(file.type)) return { ok: false, error: "Upload a JPEG, PNG, WebP or HEIC photo" };
  const input = Buffer.from(await file.arrayBuffer());
  let out: { data: Buffer; info: { width: number; height: number } };
  try {
    // Low memory: one image at a time, no cache (the free server has 512MB)
    sharp.concurrency(1);
    sharp.cache(false);
    out = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "That file couldn't be read as an image" };
  }
  const name = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "photo";
  const [m] = await db
    .insert(schema.media)
    .values({ filename: name, alt: alt.trim().slice(0, 200), contentType: "image/webp", width: out.info.width, height: out.info.height, bytes: out.data.length, data: out.data })
    .returning({ id: schema.media.id });
  await audit(actor, "media.upload", "media", m.id, { filename: name, bytes: out.data.length }, db);
  return { ok: true, data: { id: m.id }, message: "Photo uploaded" };
}

export async function deleteMedia(actor: StaffUser, id: string, db: DB = getDb()): Promise<ActionResult> {
  const used = await db.select({ name: schema.menuItems.name }).from(schema.menuItems).where(eq(schema.menuItems.imagePath, `media:${id}`));
  if (used.length) return { ok: false, error: `This photo is used by: ${used.map((u) => u.name).join(", ")}. Choose another photo for those dishes first.` };
  const [m] = await db.delete(schema.media).where(eq(schema.media.id, id)).returning({ filename: schema.media.filename });
  if (!m) return { ok: false, error: "Photo not found" };
  await audit(actor, "media.delete", "media", id, { filename: m.filename }, db);
  return { ok: true, message: "Photo deleted" };
}
