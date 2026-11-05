import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema, type DB, type DbOrTx } from "@/lib/db";
import { checkoutSchema, type CheckoutInput } from "@/lib/domain/checkout-schema";
import { checkPickup } from "@/lib/domain/schedule";
import { priceCart } from "@/lib/domain/pricing";
import { fieldErrors } from "@/lib/domain/validation";
import type { Order, OrderStatus } from "@/lib/db/schema";
import { loadCatalog } from "./catalog";
import { notifyOrder } from "./notifications";
import { cartNeeds, loadScheduleContext, loadUsage } from "./schedule";

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function newReference(): string {
  const bytes = randomBytes(6);
  return "DSK-" + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}
export const newTrackingToken = () => randomBytes(24).toString("base64url");

export type ReservationResult =
  | { ok: true; order: Order; reused: boolean }
  | { ok: false; code: "INVALID" | "CART" | "SLOT" | "CLOSED"; error: string; fieldErrors?: Record<string, string>; lineErrors?: { key: string; message: string }[] };

/** Records a status change, only if the order is still in the expected status. Returns true if it changed. */
export async function transitionOrder(db: DbOrTx, orderId: string, from: OrderStatus | OrderStatus[], to: OrderStatus, actor: string, note?: string, extra: Partial<typeof schema.orders.$inferInsert> = {}): Promise<boolean> {
  const froms = Array.isArray(from) ? from : [from];
  const res = await db
    .update(schema.orders)
    .set({ status: to, ...extra })
    .where(and(eq(schema.orders.id, orderId), sql`${schema.orders.status} in (${sql.join(froms.map((f) => sql`${f}`), sql`, `)})`))
    .returning({ id: schema.orders.id });
  if (!res.length) return false;
  await db.insert(schema.orderEvents).values({ orderId, fromStatus: froms.length === 1 ? froms[0] : null, toStatus: to, actor, note: note ?? null });
  return true;
}

/**
 * Creates an order in PENDING_PAYMENT that holds its pickup slot for `paymentHoldMinutes`.
 *
 * Concurrency: all reservations for the same pickup date are serialised with a transaction-scoped
 * Postgres advisory lock, and capacity is re-counted inside that lock. Two customers racing for the
 * last place in a slot can never both get it. Idempotent on `idempotencyKey`.
 */
export async function createReservation(raw: CheckoutInput, opts: { now?: Date; customerId?: string | null; db?: DB } = {}): Promise<ReservationResult> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID", error: parsed.error.issues[0]?.message ?? "Check your details", fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const existing = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
  if (existing) return { ok: true, order: existing, reused: true };

  return db.transaction(async (tx): Promise<ReservationResult> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"pickup:" + input.pickupDate}))`);

    // Re-check idempotency inside the lock (two identical submissions racing)
    const dup = await tx.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
    if (dup) return { ok: true, order: dup, reused: true };

    const ctx = await loadScheduleContext(tx);
    if (!ctx.settings.acceptingOrders) return { ok: false, code: "CLOSED", error: "We're not taking online orders right now. Please call us to order." };
    const cash = input.paymentMethod === "CASH";
    if (cash && !ctx.settings.acceptCash) return { ok: false, code: "INVALID", error: "Cash at pickup isn't available right now. Please pay by card.", fieldErrors: { paymentMethod: "Choose card payment" } };
    if (!cash && !ctx.settings.acceptCard) return { ok: false, code: "INVALID", error: "Card payment isn't available right now. Please choose cash at pickup.", fieldErrors: { paymentMethod: "Choose cash at pickup" } };

    const catalog = await loadCatalog(tx, input.lines.map((l) => l.menuItemId));
    const quote = priceCart(input.lines, catalog, { gstRegistered: ctx.settings.gstRegistered, gstMode: ctx.settings.gstMode });
    if (quote.errors.length || !quote.lines.length) {
      return { ok: false, code: "CART", error: quote.errors[0]?.message ?? "Your order is empty", lineErrors: quote.errors.map((e) => ({ key: e.key, message: e.message })) };
    }

    const needs = await cartNeeds(tx, quote.lines);
    const usage = await loadUsage(tx, input.pickupDate, input.pickupDate, now);
    const check = checkPickup(input.pickupDate, input.pickupTime, now, ctx.rules, ctx.hours, ctx.closed, needs, usage);
    if (!check.ok) return { ok: false, code: "SLOT", error: check.reason, fieldErrors: { pickupTime: check.reason } };

    // Card: hold the slot while the customer pays. Cash: the order is placed straight away.
    const holdExpiresAt = cash ? null : new Date(now.getTime() + ctx.settings.paymentHoldMinutes * 60_000);
    let order: Order | undefined;
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      const inserted = await tx
        .insert(schema.orders)
        .values({
          reference: newReference(),
          idempotencyKey: input.idempotencyKey,
          customerId: opts.customerId ?? null,
          customerName: input.name,
          customerEmail: input.email,
          customerPhone: input.phone,
          notes: input.notes || null,
          pickupDate: input.pickupDate,
          pickupTime: input.pickupTime,
          pickupAt: check.startsAt,
          status: cash ? "NEW" : "PENDING_PAYMENT",
          paymentMethod: cash ? "CASH" : "CARD",
          subtotalCents: quote.subtotalCents,
          gstCents: quote.gstCents,
          totalCents: quote.totalCents,
          gstRegisteredAtOrder: ctx.settings.gstRegistered,
          holdExpiresAt,
          trackingToken: newTrackingToken(),
          smsOptIn: input.smsOptIn,
        })
        .onConflictDoNothing({ target: schema.orders.reference })
        .returning();
      order = inserted[0];
    }
    if (!order) throw new Error("Could not allocate an order reference");

    await tx.insert(schema.orderItems).values(
      quote.lines.map((l) => ({
        orderId: order!.id,
        menuItemId: l.menuItemId,
        name: l.name,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        options: l.options,
        lineTotalCents: l.lineTotalCents,
        gstTreatment: l.gstTreatment,
        gstCents: l.gstCents,
      })),
    );
    if (cash) {
      await tx.insert(schema.orderEvents).values({ orderId: order.id, fromStatus: null, toStatus: "NEW", actor: "customer", note: "Cash at pickup" });
      await notifyOrder(tx, order.id, "order_confirmed");
    } else {
      await tx.insert(schema.orderEvents).values({ orderId: order.id, fromStatus: null, toStatus: "PENDING_PAYMENT", actor: "customer", note: `Slot held until ${holdExpiresAt!.toISOString()}` });
    }
    return { ok: true, order, reused: false };
  });
}

/**
 * Records cash taken at pickup as a completed payment, so cash orders appear in payments,
 * reports and receipts exactly like card orders. Idempotent per order.
 */
export async function recordCashPayment(orderId: string, actor: string, db: DB = getDb()): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!order) return { ok: false, error: "Order not found" } as const;
    if (order.paymentMethod !== "CASH") return { ok: false, error: "This order was paid by card" } as const;
    if (order.paidAt) return { ok: true, message: "Cash was already recorded for this order" } as const;
    if (["CANCELLED", "REFUNDED", "EXPIRED", "PAYMENT_FAILED", "PENDING_PAYMENT"].includes(order.status)) return { ok: false, error: "This order isn't active" } as const;
    const now = new Date();
    await tx.insert(schema.payments).values({
      orderId: order.id,
      provider: "cash",
      providerSessionId: `cash:${order.id}`,
      providerPaymentId: `cash:${order.id}`,
      amountCents: order.totalCents,
      status: "SUCCEEDED",
    }).onConflictDoNothing();
    await tx.update(schema.orders).set({ paidAt: now, cashCollectedAt: now }).where(eq(schema.orders.id, order.id));
    await tx.insert(schema.orderEvents).values({ orderId: order.id, fromStatus: order.status, toStatus: order.status, actor, note: "Cash received at pickup" });
    return { ok: true, message: "Cash payment recorded" } as const;
  });
}

/** Releases unpaid holds whose time has run out. Safe to run concurrently and repeatedly. */
export async function expireStaleHolds(now = new Date(), db: DbOrTx = getDb()): Promise<string[]> {
  const rows = await db
    .update(schema.orders)
    .set({ status: "EXPIRED" })
    .where(and(eq(schema.orders.status, "PENDING_PAYMENT"), lt(schema.orders.holdExpiresAt, now)))
    .returning({ id: schema.orders.id });
  if (rows.length) {
    await db.insert(schema.orderEvents).values(rows.map((r) => ({ orderId: r.id, fromStatus: "PENDING_PAYMENT" as const, toStatus: "EXPIRED" as const, actor: "system", note: "Payment not completed in time; slot released" })));
  }
  return rows.map((r) => r.id);
}

export async function getOrderByReference(reference: string, db: DbOrTx = getDb()) {
  return db.query.orders.findFirst({ where: eq(schema.orders.reference, reference), with: { items: true, events: true, payments: true, refunds: true } });
}
