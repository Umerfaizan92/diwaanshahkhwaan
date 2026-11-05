import "server-only";
import { asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DB } from "@/lib/db";
import { isDateString, isTimeString, timeToMinutes, toZoned } from "@/lib/domain/time";
import { audit } from "./audit";
import type { StaffUser } from "./auth";
import type { ActionResult } from "./action";

export const rulesSchema = z.object({
  acceptingOrders: z.boolean(),
  minNoticeHours: z.number().int().min(0, "Can't be negative").max(24 * 14),
  maxAdvanceDays: z.number().int().min(1, "At least 1 day").max(90, "90 days at most"),
  orderCutoffTime: z.string().refine(isTimeString, "Use HH:MM, e.g. 20:00").nullable(),
  slotMinutes: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  slotCapacity: z.number().int().min(1, "At least 1 order per slot").max(100),
  dailyOrderLimit: z.number().int().min(1, "At least 1 order per day").max(1000),
  paymentHoldMinutes: z.number().int().min(10, "At least 10 minutes").max(60, "60 minutes at most"),
  cancelDeadlineHours: z.number().int().min(0).max(24 * 14),
});

const hoursSchema = z
  .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(), openTime: z.string().refine(isTimeString), closeTime: z.string().refine(isTimeString) }))
  .length(7)
  .superRefine((rows, ctx) => {
    rows.forEach((r, i) => {
      if (r.isOpen && timeToMinutes(r.closeTime) <= timeToMinutes(r.openTime)) ctx.addIssue({ code: "custom", path: [i, "closeTime"], message: "Closing time must be after opening time" });
    });
  });

const closedSchema = z.object({ date: z.string().refine(isDateString, "Choose a date"), reason: z.string().trim().max(120).nullable() });

function zErr(e: z.ZodError): ActionResult<never> {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[i.path.join(".")] ??= i.message;
  return { ok: false, error: e.issues[0]?.message ?? "Check the form", fieldErrors: fe };
}

export async function saveRules(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = rulesSchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  const [before] = await db.select().from(schema.businessSettings).limit(1);
  await db.update(schema.businessSettings).set(p.data).where(eq(schema.businessSettings.id, 1));
  const changes = Object.fromEntries(Object.entries(p.data).filter(([k, v]) => (before as Record<string, unknown>)[k] !== v).map(([k, v]) => [k, { from: (before as Record<string, unknown>)[k], to: v }]));
  await audit(actor, "schedule.rules", "business_settings", "1", changes, db);
  return { ok: true, message: "Ordering rules saved" };
}

export async function saveHours(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = hoursSchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  await db.transaction(async (tx) => {
    for (const r of p.data) {
      await tx.insert(schema.openingHours).values(r).onConflictDoUpdate({ target: schema.openingHours.dayOfWeek, set: { isOpen: r.isOpen, openTime: r.openTime, closeTime: r.closeTime } });
    }
  });
  await audit(actor, "schedule.hours", "opening_hours", null, { hours: p.data }, db);
  return { ok: true, message: "Pickup hours saved" };
}

export async function addClosedDate(actor: StaffUser, raw: unknown, db: DB = getDb()): Promise<ActionResult> {
  const p = closedSchema.safeParse(raw);
  if (!p.success) return zErr(p.error);
  await db.insert(schema.closedDates).values(p.data).onConflictDoUpdate({ target: schema.closedDates.date, set: { reason: p.data.reason } });
  await audit(actor, "schedule.closed_add", "closed_date", p.data.date, { reason: p.data.reason }, db);
  return { ok: true, message: "Closed date added. Existing orders for that date are not cancelled automatically — check the order board." };
}

export async function removeClosedDate(actor: StaffUser, date: string, db: DB = getDb()): Promise<ActionResult> {
  if (!isDateString(date)) return { ok: false, error: "Invalid date" };
  await db.delete(schema.closedDates).where(eq(schema.closedDates.date, date));
  await audit(actor, "schedule.closed_remove", "closed_date", date, {}, db);
  return { ok: true, message: "Closed date removed" };
}

export async function upcomingClosedDates(tz: string, db: DB = getDb()) {
  const today = toZoned(new Date(), tz).date;
  return db.select().from(schema.closedDates).where(gte(schema.closedDates.date, today)).orderBy(asc(schema.closedDates.date));
}
