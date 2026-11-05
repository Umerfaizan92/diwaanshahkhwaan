import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema, type DB, type Tx } from "@/lib/db";
import { checkPickup } from "@/lib/domain/schedule";
import { formatCents } from "@/lib/domain/money";
import { canTransition } from "@/lib/domain/order-status";
import type { Order, OrderStatus } from "@/lib/db/schema";
import { getPaymentProvider, WebhookSignatureError, type PaymentEvent, type PaymentProvider } from "./payment-providers";
import { cartNeeds, loadScheduleContext, loadUsage } from "./schedule";
import { expireStaleHolds, transitionOrder } from "./orders";
import { audit } from "./audit";
import { notifyOrder } from "./notifications";
import type { StaffUser } from "./auth";
import { appUrl } from "@/lib/config/app-url";


export function orderUrl(order: Pick<Order, "reference" | "trackingToken">, extra = "") {
  return `${appUrl()}/order/${order.reference}?t=${order.trackingToken}${extra}`;
}

/* ---------------- Starting a payment ---------------- */

export async function startPayment(orderId: string, opts: { db?: DB; provider?: PaymentProvider; now?: Date } = {}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true, payments: true } });
  if (!order) return { ok: false, error: "Order not found" };
  if (!["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) {
    return order.paidAt ? { ok: true, url: orderUrl(order) } : { ok: false, error: "This order can no longer be paid. Please start a new order." };
  }
  if (!order.holdExpiresAt || order.holdExpiresAt <= now) return { ok: false, error: "Your pickup time was held for a limited time and has been released. Please choose a time again." };

  let provider: PaymentProvider;
  try {
    provider = opts.provider ?? getPaymentProvider();
  } catch (e) {
    console.error("[payments] provider unavailable", e);
    return { ok: false, error: "Online payment is temporarily unavailable. Please call us to order." };
  }

  // Reuse an open session for this order (double clicks, back button)
  const open = order.payments.find((p) => p.status === "CREATED" && p.provider === provider.name && p.checkoutUrl);
  if (open) return { ok: true, url: open.checkoutUrl! };

  const attempt = order.payments.length + 1;
  try {
    const session = await provider.createCheckout({
      orderId: order.id,
      reference: order.reference,
      amountCents: order.totalCents,
      lines: order.items.map((i) => ({ name: i.options.length ? `${i.name} (${i.options.map((o) => o.choice).join(", ")})` : i.name, unitAmountCents: i.unitPriceCents, quantity: i.quantity })),
      customerEmail: order.customerEmail,
      successUrl: orderUrl(order, "&from=payment"),
      cancelUrl: `${appUrl()}/checkout/cancelled?ref=${order.reference}&t=${order.trackingToken}`,
      expiresAt: order.holdExpiresAt,
      idempotencyKey: `checkout:${order.id}:${attempt}`,
    });
    await db.insert(schema.payments).values({ orderId: order.id, provider: provider.name, providerSessionId: session.sessionId, amountCents: order.totalCents, checkoutUrl: session.url });
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[payments] createCheckout failed", e);
    return { ok: false, error: "We couldn't start the payment. Your pickup time is still held — please try again." };
  }
}

/* ---------------- Webhooks ---------------- */

export type IngestResult = { status: 200 | 400 | 500; body: string };

/** Entry point for every provider webhook. Signature is verified before anything is trusted. */
export async function ingestWebhook(providerName: string, rawBody: string, headers: Headers, db: DB = getDb()): Promise<IngestResult> {
  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider(providerName);
  } catch {
    return { status: 400, body: "unknown provider" };
  }
  let event: PaymentEvent;
  try {
    event = await provider.parseWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return { status: 400, body: "invalid signature" };
    return { status: 400, body: "invalid payload" };
  }
  try {
    const r = await handlePaymentEvent(provider.name, event, db);
    return { status: 200, body: r };
  } catch (e) {
    console.error("[payments] webhook processing failed", e);
    return { status: 500, body: "processing error" }; // provider will retry
  }
}

/**
 * Applies a verified payment event exactly once. The event id is recorded in the same
 * transaction as its effects, so retries and duplicates are no-ops.
 */
export async function handlePaymentEvent(providerName: string, event: PaymentEvent, db: DB = getDb(), now = new Date()): Promise<string> {
  if (event.type === "ignored") return `ignored: ${event.reason}`;
  return db.transaction(async (tx) => {
    const fresh = await tx.insert(schema.paymentEvents).values({ id: `${providerName}:${event.id}`, provider: providerName, type: event.type }).onConflictDoNothing().returning();
    if (!fresh.length) return "duplicate";

    if (event.type === "refund.updated") {
      const [ref] = await tx.update(schema.refunds).set({ status: event.status }).where(eq(schema.refunds.providerRefundId, event.refundId)).returning();
      return ref ? `refund ${event.status}` : "refund not found";
    }

    const [found] = await tx.select({ id: schema.payments.id, orderId: schema.payments.orderId }).from(schema.payments).where(and(eq(schema.payments.providerSessionId, event.sessionId), eq(schema.payments.provider, providerName)));
    if (!found) return "unknown session";
    // Lock order first, then payment — the same order used everywhere else
    const order = (await tx.select().from(schema.orders).where(eq(schema.orders.id, found.orderId)).for("update"))[0];
    const [payment] = await tx.select().from(schema.payments).where(eq(schema.payments.id, found.id)).for("update");

    if (event.type === "payment.succeeded") {
      if (payment.status === "SUCCEEDED") return "already paid";
      await tx.update(schema.payments).set({ status: "SUCCEEDED", providerPaymentId: event.paymentId }).where(eq(schema.payments.id, payment.id));
      return confirmPaidOrder(tx, order, payment.amountCents, event.amountCents, event.currency, now);
    }
    if (event.type === "payment.failed") {
      if (payment.status !== "CREATED") return "ignored (payment not open)";
      await tx.update(schema.payments).set({ status: "FAILED", failureReason: event.reason }).where(eq(schema.payments.id, payment.id));
      await transitionOrder(tx, order.id, "PENDING_PAYMENT", "PAYMENT_FAILED", "payment", event.reason);
      return "payment failed";
    }
    if (event.type === "checkout.expired") {
      if (payment.status !== "CREATED") return "ignored (payment not open)";
      await tx.update(schema.payments).set({ status: "EXPIRED" }).where(eq(schema.payments.id, payment.id));
      const others = await tx.select().from(schema.payments).where(and(eq(schema.payments.orderId, order.id), inArray(schema.payments.status, ["CREATED", "SUCCEEDED"])));
      if (!others.length) await transitionOrder(tx, order.id, ["PENDING_PAYMENT", "PAYMENT_FAILED"], "EXPIRED", "payment", "Checkout session expired");
      return "checkout expired";
    }
    return "unhandled";
  });
}

async function confirmPaidOrder(tx: Tx, order: Order, expectedCents: number, paidCents: number, currency: string, now: Date): Promise<string> {
  const attention: string[] = [];
  if (paidCents !== expectedCents || currency.toLowerCase() !== "aud") {
    attention.push(`Amount mismatch: expected ${formatCents(expectedCents)} AUD, provider reported ${formatCents(paidCents)} ${currency.toUpperCase()}`);
  }
  if (order.paidAt) attention.push("A second payment was received for this order — refund the duplicate");

  const from = order.status;
  if (from === "EXPIRED" || from === "CANCELLED") {
    // Paid after the hold lapsed: accept the money, then check whether the kitchen can still fit it
    const ctx = await loadScheduleContext(tx);
    const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    const needs = await cartNeeds(tx, items);
    const usage = await loadUsage(tx, order.pickupDate, order.pickupDate, now, order.id);
    const fit = checkPickup(order.pickupDate, order.pickupTime, now, { ...ctx.rules, acceptingOrders: true, minNoticeHours: 0, orderCutoffTime: null }, ctx.hours, ctx.closed, { ...needs, prepLeadHours: 0 }, usage);
    if (from === "CANCELLED") attention.push("Paid after the order was cancelled — refund or reinstate");
    else if (!fit.ok) attention.push(`Paid after the pickup hold expired and the slot can't take it now (${fit.reason}) — accept anyway or refund`);
  }

  if (["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"].includes(from)) {
    const target: OrderStatus = "NEW";
    await tx
      .update(schema.orders)
      .set({ status: target, paidAt: order.paidAt ?? now, holdExpiresAt: null, attentionReason: attention.length ? attention.join(" · ") : null })
      .where(eq(schema.orders.id, order.id));
    await tx.insert(schema.orderEvents).values({ orderId: order.id, fromStatus: from, toStatus: target, actor: "payment", note: attention.length ? attention.join(" · ") : "Payment confirmed by provider" });
    await notifyOrder(tx, order.id, "order_confirmed");
    if (attention.length) await audit(null, "order.payment_attention", "order", order.id, { attention }, tx);
    return "order confirmed";
  }
  // Already progressed (e.g. duplicate payment for a confirmed order)
  if (attention.length) {
    await tx.update(schema.orders).set({ attentionReason: attention.join(" · ") }).where(eq(schema.orders.id, order.id));
    await audit(null, "order.payment_attention", "order", order.id, { attention }, tx);
  }
  return "payment recorded";
}

/* ---------------- Reconciliation ---------------- */

/**
 * Asks the provider directly (server-to-server) whether open payments for an order were paid.
 * Used when a customer returns from checkout before the webhook arrives, and by staff.
 * Never trusts the browser.
 */
export async function reconcileOrder(orderId: string, db: DB = getDb()): Promise<{ changed: boolean; results: string[] }> {
  const pays = await db.select().from(schema.payments).where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "CREATED")));
  const results: string[] = [];
  for (const p of pays) {
    let provider: PaymentProvider;
    try {
      provider = getPaymentProvider(p.provider);
    } catch {
      results.push(`${p.providerSessionId}: provider unavailable`);
      continue;
    }
    try {
      const s = await provider.retrieveSession(p.providerSessionId);
      if (s.status === "paid") {
        results.push(await handlePaymentEvent(p.provider, { id: `reconcile:${p.providerSessionId}:paid`, type: "payment.succeeded", sessionId: p.providerSessionId, paymentId: s.paymentId, amountCents: s.amountCents, currency: s.currency }, db));
      } else if (s.status === "expired" || s.status === "cancelled") {
        results.push(await handlePaymentEvent(p.provider, { id: `reconcile:${p.providerSessionId}:expired`, type: "checkout.expired", sessionId: p.providerSessionId }, db));
      } else results.push(`${p.providerSessionId}: ${s.status}`);
    } catch (e) {
      console.error("[payments] reconcile failed", e);
      results.push(`${p.providerSessionId}: lookup failed`);
    }
  }
  return { changed: results.some((r) => r === "order confirmed" || r === "checkout expired"), results };
}

/* ---------------- Customer cancellation of an unpaid checkout ---------------- */

export async function cancelUnpaidOrder(orderId: string, db: DB = getDb()): Promise<boolean> {
  const pays = await db.select().from(schema.payments).where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "CREATED")));
  // Make sure nothing was actually paid before cancelling
  await reconcileOrder(orderId, db);
  const changed = await transitionOrder(db, orderId, ["PENDING_PAYMENT", "PAYMENT_FAILED"], "CANCELLED", "customer", "Customer cancelled at checkout", { holdExpiresAt: null, cancelReason: "Cancelled by customer before payment" });
  if (changed) {
    for (const p of pays) {
      try {
        await getPaymentProvider(p.provider).expireSession(p.providerSessionId);
      } catch {
        /* best effort */
      }
      await db.update(schema.payments).set({ status: "CANCELLED" }).where(and(eq(schema.payments.id, p.id), eq(schema.payments.status, "CREATED")));
    }
  }
  return changed;
}

/* ---------------- Refunds ---------------- */

export async function refundOrder(
  actor: StaffUser,
  input: { orderId: string; amountCents: number; reason: string; idempotencyKey: string; cancelOrder: boolean },
  db: DB = getDb(),
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false, error: "Enter a refund amount" };
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.idempotencyKey)) return { ok: false, error: "Invalid request" };

  const existing = await db.select().from(schema.refunds).where(eq(schema.refunds.idempotencyKey, input.idempotencyKey));
  if (existing.length) return { ok: true, message: "Refund already processed" };

  // Reserve the refund amount under a row lock so two staff can't over-refund
  const reserved = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, input.orderId)).for("update");
    if (!order) return { error: "Order not found" } as const;
    const [payment] = await tx.select().from(schema.payments).where(and(eq(schema.payments.orderId, order.id), inArray(schema.payments.status, ["SUCCEEDED", "PARTIALLY_REFUNDED"]))).orderBy(desc(schema.payments.createdAt)).for("update");
    if (!payment || !payment.providerPaymentId) return { error: "There's no completed payment to refund on this order" } as const;
    const pending = await tx.select({ s: sql<number>`coalesce(sum(${schema.refunds.amountCents}),0)::int` }).from(schema.refunds).where(and(eq(schema.refunds.paymentId, payment.id), inArray(schema.refunds.status, ["PENDING", "SUCCEEDED"])));
    const refundable = payment.amountCents - pending[0].s;
    if (input.amountCents > refundable) return { error: `You can refund at most ${formatCents(refundable)}` } as const;
    const [refund] = await tx
      .insert(schema.refunds)
      .values({ orderId: order.id, paymentId: payment.id, amountCents: input.amountCents, reason: input.reason || null, idempotencyKey: input.idempotencyKey, createdBy: actor.email })
      .returning();
    return { order, payment, refund } as const;
  });
  if ("error" in reserved) return { ok: false, error: reserved.error! };
  const { order, payment, refund } = reserved;

  let result: { refundId: string; status: "SUCCEEDED" | "PENDING" | "FAILED" };
  try {
    result = await getPaymentProvider(payment.provider).refund({ paymentId: payment.providerPaymentId!, amountCents: input.amountCents, idempotencyKey: `refund:${refund.id}`, reason: input.reason });
  } catch (e) {
    console.error("[payments] refund failed", e);
    await db.update(schema.refunds).set({ status: "FAILED" }).where(eq(schema.refunds.id, refund.id));
    await audit(actor, "order.refund_failed", "order", order.id, { amountCents: input.amountCents }, db);
    return { ok: false, error: "The payment provider didn't accept the refund. Nothing was refunded — try again or refund from the provider dashboard." };
  }

  await db.transaction(async (tx) => {
    // Lock in the same order as reservations (order, then payment) to avoid deadlocks
    await tx.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.id, order.id)).for("update");
    const [pay] = await tx.select().from(schema.payments).where(eq(schema.payments.id, payment.id)).for("update");
    await tx.update(schema.refunds).set({ status: result.status === "FAILED" ? "FAILED" : result.status, providerRefundId: result.refundId }).where(eq(schema.refunds.id, refund.id));
    if (result.status === "FAILED") return;
    const newRefunded = pay.refundedCents + input.amountCents;
    await tx.update(schema.payments).set({ refundedCents: newRefunded, status: newRefunded >= pay.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" }).where(eq(schema.payments.id, payment.id));
    const [o] = await tx.update(schema.orders).set({ refundedCents: sql`${schema.orders.refundedCents} + ${input.amountCents}` }).where(eq(schema.orders.id, order.id)).returning();
    let status = o.status;
    if (input.cancelOrder && canTransition(status, "CANCELLED")) {
      await transitionOrder(tx, order.id, status, "CANCELLED", actor.email, input.reason || "Cancelled with refund", { cancelReason: input.reason || null });
      status = "CANCELLED";
    }
    if (o.refundedCents >= o.totalCents && canTransition(status, "REFUNDED")) {
      await transitionOrder(tx, order.id, status, "REFUNDED", actor.email, `Refunded ${formatCents(o.refundedCents)}`);
    }
    await notifyOrder(tx, order.id, o.refundedCents >= o.totalCents ? "order_refunded" : "order_partially_refunded", { amountCents: input.amountCents, refundId: refund.id });
  });
  await audit(actor, "order.refund", "order", order.id, { amountCents: input.amountCents, reason: input.reason, providerStatus: result.status }, db);
  if (result.status === "FAILED") return { ok: false, error: "The refund was declined by the payment provider." };
  return { ok: true, message: `Refunded ${formatCents(input.amountCents)}${result.status === "PENDING" ? " (processing)" : ""}` };
}

/* ---------------- Background sweep ---------------- */

/** Expires stale holds (and their provider sessions) and reconciles payments left open too long */
export async function sweepPayments(now = new Date(), db: DB = getDb()) {
  // Before expiring, ask the provider about anything that might have been paid
  const stale = await db
    .select({ orderId: schema.orders.id })
    .from(schema.orders)
    .where(and(inArray(schema.orders.status, ["PENDING_PAYMENT", "PAYMENT_FAILED"]), lt(schema.orders.holdExpiresAt, now)));
  for (const s of stale) await reconcileOrder(s.orderId, db);
  const expired = await expireStaleHolds(now, db);
  const failedExpired = await db
    .update(schema.orders)
    .set({ status: "EXPIRED" })
    .where(and(eq(schema.orders.status, "PAYMENT_FAILED"), lt(schema.orders.holdExpiresAt, now)))
    .returning({ id: schema.orders.id });
  for (const id of [...expired, ...failedExpired.map((x) => x.id)]) {
    const open = await db.select().from(schema.payments).where(and(eq(schema.payments.orderId, id), eq(schema.payments.status, "CREATED")));
    for (const p of open) {
      try {
        await getPaymentProvider(p.provider).expireSession(p.providerSessionId);
      } catch {
        /* best effort; a late payment is still handled safely */
      }
    }
  }
  return { expired: expired.length + failedExpired.length };
}
