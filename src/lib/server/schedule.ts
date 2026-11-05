import "server-only";
import { and, asc, eq, gt, gte, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, schema, type DbOrTx } from "@/lib/db";
import { buildAvailability, emptyUsage, type CartNeeds, type Day, type DayHours, type ScheduleRules, type Usage } from "@/lib/domain/schedule";
import { ACTIVE_STATUSES } from "@/lib/domain/order-status";
import { addDays, toZoned } from "@/lib/domain/time";
import type { BusinessSettings } from "@/lib/db/schema";
import type { PricedLine } from "@/lib/domain/pricing";
import { loadCatalog } from "./catalog";

export type ScheduleContext = { rules: ScheduleRules; hours: DayHours[]; closed: Map<string, string | null>; settings: BusinessSettings };

export async function loadScheduleContext(db: DbOrTx = getDb()): Promise<ScheduleContext> {
  const [settings] = await db.select().from(schema.businessSettings).limit(1);
  if (!settings) throw new Error("Business settings missing — run the seed");
  const hours = await db.select().from(schema.openingHours).orderBy(asc(schema.openingHours.dayOfWeek));
  const closedRows = await db.select().from(schema.closedDates);
  return {
    settings,
    rules: {
      timezone: settings.timezone,
      acceptingOrders: settings.acceptingOrders,
      minNoticeHours: settings.minNoticeHours,
      maxAdvanceDays: settings.maxAdvanceDays,
      slotMinutes: settings.slotMinutes,
      slotCapacity: settings.slotCapacity,
      dailyOrderLimit: settings.dailyOrderLimit,
      orderCutoffTime: settings.orderCutoffTime,
    },
    hours,
    closed: new Map(closedRows.map((c) => [c.date, c.reason])),
  };
}

/** Orders that hold capacity right now: paid/active, or awaiting payment with an unexpired hold */
export function holdsCapacity(now: Date) {
  return or(inArray(schema.orders.status, ACTIVE_STATUSES), and(eq(schema.orders.status, "PENDING_PAYMENT"), gt(schema.orders.holdExpiresAt, now)));
}

export async function loadUsage(db: DbOrTx, fromDate: string, toDate: string, now: Date, excludeOrderId?: string): Promise<Usage> {
  const usage = emptyUsage();
  const where = and(gte(schema.orders.pickupDate, fromDate), lte(schema.orders.pickupDate, toDate), holdsCapacity(now), excludeOrderId ? sql`${schema.orders.id} <> ${excludeOrderId}` : undefined);
  const rows = await db
    .select({ date: schema.orders.pickupDate, time: schema.orders.pickupTime, n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(where)
    .groupBy(schema.orders.pickupDate, schema.orders.pickupTime);
  for (const r of rows) {
    usage.ordersBySlot.set(`${r.date} ${r.time}`, r.n);
    usage.ordersByDate.set(r.date, (usage.ordersByDate.get(r.date) ?? 0) + r.n);
  }
  const qty = await db
    .select({ date: schema.orders.pickupDate, itemId: schema.orderItems.menuItemId, q: sql<number>`sum(${schema.orderItems.quantity})::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(where)
    .groupBy(schema.orders.pickupDate, schema.orderItems.menuItemId);
  for (const r of qty) usage.qtyByDateItem.set(`${r.date}|${r.itemId}`, r.q);
  return usage;
}

/** Derives the scheduling constraints of a priced cart */
export async function cartNeeds(db: DbOrTx, lines: Pick<PricedLine, "menuItemId" | "quantity">[]): Promise<CartNeeds> {
  const catalog = await loadCatalog(db, lines.map((l) => l.menuItemId));
  const qtyById = new Map<string, number>();
  for (const l of lines) qtyById.set(l.menuItemId, (qtyById.get(l.menuItemId) ?? 0) + l.quantity);
  const needs: CartNeeds = { prepLeadHours: 0, dayRestricted: [], dailyLimited: [] };
  for (const [id, quantity] of qtyById) {
    const item = catalog.get(id);
    if (!item) continue;
    needs.prepLeadHours = Math.max(needs.prepLeadHours, item.prepLeadHours);
    if (item.availableDays.length) needs.dayRestricted.push({ name: item.name, days: item.availableDays });
    if (item.dailyLimit) needs.dailyLimited.push({ id, name: item.name, limit: item.dailyLimit, quantity });
  }
  return needs;
}

export async function availabilityForCart(lines: Pick<PricedLine, "menuItemId" | "quantity">[], now = new Date(), db: DbOrTx = getDb()): Promise<{ days: Day[]; ctx: ScheduleContext }> {
  const ctx = await loadScheduleContext(db);
  const today = toZoned(now, ctx.rules.timezone).date;
  const [needs, usage] = await Promise.all([cartNeeds(db, lines), loadUsage(db, today, addDays(today, ctx.rules.maxAdvanceDays), now)]);
  return { days: buildAvailability(now, ctx.rules, ctx.hours, ctx.closed, needs, usage), ctx };
}
