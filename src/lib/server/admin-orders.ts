import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/lib/db";
import { canTransition } from "@/lib/domain/order-status";
import { can } from "@/lib/domain/permissions";
import type { OrderStatus } from "@/lib/db/schema";
import { transitionOrder } from "./orders";
import { notifyOrder, type OrderNotice } from "./notifications";
import { audit } from "./audit";
import type { StaffUser } from "./auth";
import type { ActionResult } from "./action";

export const BOARD_COLUMNS: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REFUNDED"];

const NOTICE_FOR: Partial<Record<OrderStatus, OrderNotice>> = { CONFIRMED: "order_accepted", READY: "order_ready", CANCELLED: "order_cancelled" };

/** Moves an order through the kitchen workflow. Permission and transition rules are enforced here, server-side. */
export async function staffTransition(actor: StaffUser, orderId: string, to: OrderStatus, note: string | null, db: DB = getDb()): Promise<ActionResult> {
  if (to === "CANCELLED" ? !can(actor.role, "orders:cancel") : !can(actor.role, "orders:update")) return { ok: false, error: "You don't have permission to do that." };
  if (!["CONFIRMED", "PREPARING", "READY", "COLLECTED", "CANCELLED"].includes(to)) return { ok: false, error: "That change isn't allowed here." };
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!o) return { ok: false, error: "Order not found" };
  if (!canTransition(o.status, to)) return { ok: false, error: `An order that is ${o.status.toLowerCase().replace("_", " ")} can't be moved to ${to.toLowerCase()}.` };
  if (to === "CANCELLED" && !note?.trim()) return { ok: false, error: "Add a reason for cancelling — it's shown to the customer." };
  const changed = await db.transaction(async (tx) => {
    const ok = await transitionOrder(tx, orderId, o.status, to, actor.email, note ?? undefined, to === "CANCELLED" ? { cancelReason: note } : {});
    if (ok && NOTICE_FOR[to]) await notifyOrder(tx, orderId, NOTICE_FOR[to]!, { reason: note });
    if (ok) await audit(actor, `order.${to.toLowerCase()}`, "order", orderId, { from: o.status, note }, tx);
    return ok;
  });
  if (!changed) return { ok: false, error: "Someone else updated this order first. Refresh to see the latest." };
  return { ok: true, message: to === "CANCELLED" && o.paidAt && o.refundedCents < o.totalCents ? "Order cancelled. Remember to refund the customer." : "Order updated" };
}

export async function clearAttention(actor: StaffUser, orderId: string, db: DB = getDb()): Promise<ActionResult> {
  const [o] = await db.update(schema.orders).set({ attentionReason: null }).where(eq(schema.orders.id, orderId)).returning();
  if (!o) return { ok: false, error: "Order not found" };
  await audit(actor, "order.attention_cleared", "order", orderId, {}, db);
  return { ok: true, message: "Marked as reviewed" };
}

export type BoardFilter = { from: string; to: string; q?: string };

export async function boardOrders(f: BoardFilter, db: DB = getDb()) {
  const where = and(
    inArray(schema.orders.status, BOARD_COLUMNS),
    gte(schema.orders.pickupDate, f.from),
    lte(schema.orders.pickupDate, f.to),
    f.q ? or(ilike(schema.orders.reference, `%${f.q}%`), ilike(schema.orders.customerName, `%${f.q}%`), ilike(schema.orders.customerPhone, `%${f.q}%`), ilike(schema.orders.customerEmail, `%${f.q}%`)) : undefined,
  );
  return db.query.orders.findMany({ where, with: { items: true }, orderBy: [asc(schema.orders.pickupAt)], limit: 500 });
}

export async function attentionOrders(db: DB = getDb()) {
  return db.select().from(schema.orders).where(isNotNull(schema.orders.attentionReason)).orderBy(desc(schema.orders.updatedAt)).limit(50);
}

export async function orderDetail(id: string, db: DB = getDb()) {
  return db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, events: { orderBy: asc(schema.orderEvents.at) }, payments: { orderBy: asc(schema.payments.createdAt) }, refunds: { orderBy: asc(schema.refunds.createdAt) } },
  });
}

/** Kitchen production plan for one date: what to cook, and what goes out in each slot */
export async function productionPlan(date: string, db: DB = getDb()) {
  const orders = await db.query.orders.findMany({
    where: and(eq(schema.orders.pickupDate, date), inArray(schema.orders.status, ["NEW", "CONFIRMED", "PREPARING", "READY", "COLLECTED"])),
    with: { items: true },
    orderBy: asc(schema.orders.pickupAt),
  });
  const dishes = new Map<string, { name: string; total: number; variants: Map<string, number> }>();
  for (const o of orders) {
    for (const i of o.items) {
      const d = dishes.get(i.menuItemId) ?? { name: i.name, total: 0, variants: new Map() };
      d.total += i.quantity;
      const v = i.options.map((x) => x.choice).join(", ") || "Standard";
      d.variants.set(v, (d.variants.get(v) ?? 0) + i.quantity);
      dishes.set(i.menuItemId, d);
    }
  }
  const slots = new Map<string, typeof orders>();
  for (const o of orders) slots.set(o.pickupTime, [...(slots.get(o.pickupTime) ?? []), o]);
  return {
    orders,
    dishes: [...dishes.values()].sort((a, b) => b.total - a.total).map((d) => ({ ...d, variants: [...d.variants.entries()].sort((a, b) => b[1] - a[1]) })),
    slots: [...slots.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}

export async function dashboardStats(today: string, tz: string, db: DB = getDb()) {
  const paidStatuses: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REFUNDED"];
  const [byStatus] = await db
    .select({
      newCount: sql<number>`count(*) filter (where ${schema.orders.status} = 'NEW')::int`,
      todayPickups: sql<number>`count(*) filter (where ${schema.orders.pickupDate} = ${today} and ${schema.orders.status} in ('NEW','CONFIRMED','PREPARING','READY'))::int`,
      readyCount: sql<number>`count(*) filter (where ${schema.orders.status} = 'READY')::int`,
      upcoming: sql<number>`count(*) filter (where ${schema.orders.pickupDate} > ${today} and ${schema.orders.status} in ('NEW','CONFIRMED','PREPARING','READY'))::int`,
    })
    .from(schema.orders);
  const [sales] = await db
    .select({
      today: sql<number>`coalesce(sum(${schema.orders.totalCents} - ${schema.orders.refundedCents}) filter (where (${schema.orders.paidAt} at time zone ${tz})::date = ${today}::date), 0)::int`,
      week: sql<number>`coalesce(sum(${schema.orders.totalCents} - ${schema.orders.refundedCents}) filter (where (${schema.orders.paidAt} at time zone ${tz})::date > (${today}::date - 7)), 0)::int`,
      weekOrders: sql<number>`count(*) filter (where (${schema.orders.paidAt} at time zone ${tz})::date > (${today}::date - 7))::int`,
    })
    .from(schema.orders)
    .where(and(isNotNull(schema.orders.paidAt), inArray(schema.orders.status, paidStatuses)));
  return { ...byStatus, sales };
}
