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

    const catalog = await loadCatalog(tx, input.lines.map((l) => l.menuItemId));
    const quote = priceCart(input.lines, catalog, { gstRegistered: ctx.settings.gstRegistered });
    if (quote.errors.length || !quote.lines.length) {
      return { ok: false, code: "CART", error: quote.errors[0]?.message ?? "Your order is empty", lineErrors: quote.errors.map((e) => ({ key: e.key, message: e.message })) };
    }

    const needs = await cartNeeds(tx, quote.lines);
    const usage = await loadUsage(tx, input.pickupDate, input.pickupDate, now);
    const check = checkPickup(input.pickupDate, input.pickupTime, now, ctx.rules, ctx.hours, ctx.closed, needs, usage);
    if (!check.ok) return { ok: false, code: "SLOT", error: check.reason, fieldErrors: { pickupTime: check.reason } };

    const holdExpiresAt = new Date(now.getTime() + ctx.settings.paymentHoldMinutes * 60_000);
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
          status: "PENDING_PAYMENT",
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
    await tx.insert(schema.orderEvents).values({ orderId: order.id, fromStatus: null, toStatus: "PENDING_PAYMENT", actor: "customer", note: `Slot held until ${holdExpiresAt.toISOString()}` });
    return { ok: true, order, reused: false };
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
