import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { resetDb, closeDb, owner } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { createReservation } from "@/lib/server/orders";
import { cancelUnpaidOrder, handlePaymentEvent, ingestWebhook, reconcileOrder, refundOrder, startPayment, sweepPayments } from "@/lib/server/payments";
import { DemoProvider, StripeProvider, LivePaymentsBlockedError, setPaymentProviderForTests, type PaymentProvider, type SessionState } from "@/lib/server/payment-providers";

/** In-memory stand-in for an external provider */
class MemoryProvider implements PaymentProvider {
  readonly name = "memory" as const;
  readonly isTestMode = true;
  sessions = new Map<string, SessionState & { url: string }>();
  refunds: { paymentId: string; amountCents: number; key: string }[] = [];
  failRefund = false;
  n = 0;
  async createCheckout(p: { amountCents: number; idempotencyKey: string }) {
    const id = `mem_${++this.n}`;
    this.sessions.set(id, { status: "open", paymentId: null, amountCents: p.amountCents, currency: "aud", url: `https://pay.example/${id}` });
    return { sessionId: id, url: `https://pay.example/${id}` };
  }
  async retrieveSession(id: string) {
    return this.sessions.get(id)!;
  }
  async expireSession(id: string) {
    const s = this.sessions.get(id);
    if (s && s.status === "open") s.status = "expired";
  }
  async refund(p: { paymentId: string; amountCents: number; idempotencyKey: string }) {
    if (this.failRefund) throw new Error("provider down");
    if (!this.refunds.some((r) => r.key === p.idempotencyKey)) this.refunds.push({ paymentId: p.paymentId, amountCents: p.amountCents, key: p.idempotencyKey });
    return { refundId: `re_${p.idempotencyKey}`, status: "SUCCEEDED" as const };
  }
  async parseWebhook(): Promise<never> {
    throw new Error("not used");
  }
  pay(id: string) {
    const s = this.sessions.get(id)!;
    s.status = "paid";
    s.paymentId = `pi_${id}`;
    return { id: `evt_${id}_paid`, type: "payment.succeeded" as const, sessionId: id, paymentId: s.paymentId, amountCents: s.amountCents, currency: "aud" };
  }
}

let db: DB;
let mem: MemoryProvider;
let biryaniId = "";
let mediumId = "";
const NOW = new Date(); // payments use real time for hold validity

beforeAll(async () => {
  db = await resetDb();
  const b = await db.query.menuItems.findFirst({ where: eq(schema.menuItems.slug, "shahi-chicken-biryani"), with: { optionGroups: { with: { choices: true } } } });
  biryaniId = b!.id;
  mediumId = b!.optionGroups[0].choices.find((c) => c.name === "Medium")!.id;
  // Make every future slot bookable regardless of when the test runs
  await db.update(schema.businessSettings).set({ minNoticeHours: 0, orderCutoffTime: null, maxAdvanceDays: 30 });
  await db.update(schema.openingHours).set({ isOpen: true, openTime: "00:00", closeTime: "23:30" });
});
afterAll(async () => {
  setPaymentProviderForTests(null);
  await closeDb();
});
beforeEach(async () => {
  mem = new MemoryProvider();
  setPaymentProviderForTests(mem);
  await db.execute(sql`truncate orders, order_items, order_events, payments, refunds, payment_events restart identity cascade`);
  await db.update(schema.businessSettings).set({ slotCapacity: 4 });
});

const tomorrow = () => new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
async function reserve(time = "18:00") {
  const r = await createReservation(
    { idempotencyKey: randomUUID().replace(/-/g, ""), lines: [{ menuItemId: biryaniId, quantity: 2, choiceIds: [mediumId] }], name: "Omar Ali", email: "omar@example.com", phone: "0412345678", pickupDate: tomorrow(), pickupTime: time, acceptTerms: true },
    { db, now: NOW },
  );
  if (!r.ok) throw new Error(r.error);
  return r.order;
}
const order = async (id: string) => (await db.select().from(schema.orders).where(eq(schema.orders.id, id)))[0];
const sessionOf = async (orderId: string) => (await db.select().from(schema.payments).where(eq(schema.payments.orderId, orderId)))[0].providerSessionId;

describe("payment success", () => {
  it("confirms an order only when the verified payment event arrives, exactly once", async () => {
    const o = await reserve();
    const start = await startPayment(o.id, { db });
    expect(start.ok).toBe(true);
    // Returning from the provider (redirect) without paying changes nothing
    await reconcileOrder(o.id, db);
    expect((await order(o.id)).status).toBe("PENDING_PAYMENT");

    const ev = mem.pay(await sessionOf(o.id));
    expect(await handlePaymentEvent("memory", ev, db)).toBe("order confirmed");
    expect(await handlePaymentEvent("memory", ev, db)).toBe("duplicate");
    expect(await handlePaymentEvent("memory", { ...ev, id: "evt_other_id_same_session" }, db)).toBe("already paid");
    const after = await order(o.id);
    expect(after.status).toBe("NEW");
    expect(after.paidAt).not.toBeNull();
    expect(after.holdExpiresAt).toBeNull();
    const events = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, o.id));
    expect(events.filter((e) => e.toStatus === "NEW")).toHaveLength(1);
  });

  it("reconciliation (server-to-server) confirms a paid order when the webhook is late", async () => {
    const o = await reserve();
    await startPayment(o.id, { db });
    mem.pay(await sessionOf(o.id));
    const r = await reconcileOrder(o.id, db);
    expect(r.changed).toBe(true);
    expect((await order(o.id)).status).toBe("NEW");
    // The webhook arriving afterwards is harmless
    expect(await handlePaymentEvent("memory", { id: "evt_late", type: "payment.succeeded", sessionId: await sessionOf(o.id), paymentId: "x", amountCents: 2400, currency: "aud" }, db)).toBe("already paid");
  });

  it("reuses the open checkout session on double submit", async () => {
    const o = await reserve();
    const [a, b] = [await startPayment(o.id, { db }), await startPayment(o.id, { db })];
    expect(a.ok && b.ok && a.url === b.url).toBe(true);
    expect(mem.sessions.size).toBe(1);
  });

  it("flags an amount mismatch for the owner instead of silently accepting it", async () => {
    const o = await reserve();
    await startPayment(o.id, { db });
    const id = await sessionOf(o.id);
    await handlePaymentEvent("memory", { id: "evt_mis", type: "payment.succeeded", sessionId: id, paymentId: "pi_x", amountCents: 100, currency: "aud" }, db);
    expect((await order(o.id)).attentionReason).toMatch(/Amount mismatch/);
  });
});

describe("payment failure, cancellation, expiry and retries", () => {
  it("a failed payment can be retried while the hold lasts", async () => {
    const o = await reserve();
    await startPayment(o.id, { db });
    const first = await sessionOf(o.id);
    await handlePaymentEvent("memory", { id: "evt_fail", type: "payment.failed", sessionId: first, reason: "Card declined" }, db);
    expect((await order(o.id)).status).toBe("PAYMENT_FAILED");
    const retry = await startPayment(o.id, { db });
    expect(retry.ok).toBe(true);
    expect(mem.sessions.size).toBe(2);
    const second = [...mem.sessions.keys()][1];
    await handlePaymentEvent("memory", mem.pay(second), db);
    expect((await order(o.id)).status).toBe("NEW");
  });

  it("customer cancellation releases the slot and closes the session", async () => {
    await db.update(schema.businessSettings).set({ slotCapacity: 1 });
    const o = await reserve();
    await startPayment(o.id, { db });
    await expect(reserve()).rejects.toThrow(/filled up/);
    expect(await cancelUnpaidOrder(o.id, db)).toBe(true);
    expect((await order(o.id)).status).toBe("CANCELLED");
    expect([...mem.sessions.values()][0].status).toBe("expired");
    await expect(reserve()).resolves.toBeTruthy();
  });

  it("an expired checkout session expires the unpaid order", async () => {
    const o = await reserve();
    await startPayment(o.id, { db });
    await handlePaymentEvent("memory", { id: "evt_exp", type: "checkout.expired", sessionId: await sessionOf(o.id) }, db);
    expect((await order(o.id)).status).toBe("EXPIRED");
  });

  it("the sweeper reconciles before expiring, so a paid-but-unnotified order is never lost", async () => {
    const o = await reserve();
    await startPayment(o.id, { db });
    mem.pay(await sessionOf(o.id));
    await sweepPayments(new Date(Date.now() + 60 * 60_000), db);
    expect((await order(o.id)).status).toBe("NEW");
  });

  it("a payment that arrives after expiry is accepted and flagged when the slot is now full", async () => {
    await db.update(schema.businessSettings).set({ slotCapacity: 1 });
    const o = await reserve();
    await startPayment(o.id, { db });
    const late = await sessionOf(o.id);
    await sweepPayments(new Date(Date.now() + 60 * 60_000), db);
    expect((await order(o.id)).status).toBe("EXPIRED");
    const other = await reserve(); // someone else takes the freed slot
    await startPayment(other.id, { db });
    await handlePaymentEvent("memory", mem.pay(await sessionOf(other.id)), db);
    await handlePaymentEvent("memory", { id: "evt_late_pay", type: "payment.succeeded", sessionId: late, paymentId: "pi_late", amountCents: 2400, currency: "aud" }, db);
    const lateOrder = await order(o.id);
    expect(lateOrder.status).toBe("NEW");
    expect(lateOrder.attentionReason).toMatch(/expired/);
  });
});

describe("refunds", () => {
  async function paidOrder() {
    const o = await reserve();
    await startPayment(o.id, { db });
    await handlePaymentEvent("memory", mem.pay(await sessionOf(o.id)), db);
    return o;
  }
  it("partial then full refund, with over-refund blocked and idempotent retries", async () => {
    const o = await paidOrder();
    const k1 = randomUUID().replace(/-/g, "");
    expect(await refundOrder(owner, { orderId: o.id, amountCents: 1000, reason: "Missing dip", idempotencyKey: k1, cancelOrder: false }, db)).toMatchObject({ ok: true });
    expect(await refundOrder(owner, { orderId: o.id, amountCents: 1000, reason: "Missing dip", idempotencyKey: k1, cancelOrder: false }, db)).toMatchObject({ ok: true, message: "Refund already processed" });
    expect(mem.refunds).toHaveLength(1);
    expect(await refundOrder(owner, { orderId: o.id, amountCents: 2000, reason: "", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: false }, db)).toMatchObject({ ok: false });
    expect(await refundOrder(owner, { orderId: o.id, amountCents: 1400, reason: "Cancelled", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: true }, db)).toMatchObject({ ok: true });
    const after = await order(o.id);
    expect(after.refundedCents).toBe(2400);
    expect(after.status).toBe("REFUNDED");
    const p = (await db.select().from(schema.payments).where(eq(schema.payments.orderId, o.id)))[0];
    expect(p.status).toBe("REFUNDED");
  });
  it("concurrent refunds can't exceed the amount paid", async () => {
    const o = await paidOrder();
    const rs = await Promise.all(Array.from({ length: 5 }, () => refundOrder(owner, { orderId: o.id, amountCents: 1000, reason: "", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: false }, db)));
    expect(rs.filter((r) => r.ok)).toHaveLength(2);
    expect((await order(o.id)).refundedCents).toBe(2000);
  });
  it("a provider failure records a failed refund and changes no balances", async () => {
    const o = await paidOrder();
    mem.failRefund = true;
    expect(await refundOrder(owner, { orderId: o.id, amountCents: 500, reason: "", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: false }, db)).toMatchObject({ ok: false });
    expect((await order(o.id)).refundedCents).toBe(0);
    const [r] = await db.select().from(schema.refunds).where(eq(schema.refunds.orderId, o.id));
    expect(r.status).toBe("FAILED");
  });
});

describe("webhook signature verification", () => {
  it("demo provider: accepts only correctly signed events", async () => {
    setPaymentProviderForTests(null);
    process.env.DEMO_PAYMENT_SECRET = "test-demo-secret-0123456789abcdef";
    const demo = new DemoProvider(process.env.DEMO_PAYMENT_SECRET);
    const { body, headers } = demo.signedEvent({ id: "evt_sig", type: "payment.failed", sessionId: "nope", reason: "x" });
    expect((await ingestWebhook("demo", body, headers, db)).status).toBe(200);
    expect((await ingestWebhook("demo", body.replace("nope", "tampered"), headers, db)).status).toBe(400);
    expect((await ingestWebhook("demo", body, new Headers(), db)).status).toBe(400);
  });

  it("stripe provider: verifies signatures and maps checkout events", async () => {
    setPaymentProviderForTests(null);
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_1", object: "checkout.session", payment_status: "paid", payment_intent: "pi_1", amount_total: 2400, currency: "aud" } } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
    const ok = await ingestWebhook("stripe", payload, new Headers({ "stripe-signature": header }), db);
    expect(ok).toEqual({ status: 200, body: "unknown session" });
    const bad = await ingestWebhook("stripe", payload.replace("2400", "1"), new Headers({ "stripe-signature": header }), db);
    expect(bad.status).toBe(400);
    const provider = new StripeProvider("sk_test_dummy", "whsec_test_secret");
    const ev = await provider.parseWebhook(payload, new Headers({ "stripe-signature": header }));
    expect(ev).toMatchObject({ type: "payment.succeeded", sessionId: "cs_test_1", paymentId: "pi_1", amountCents: 2400 });
  });

  it("refuses live Stripe keys without explicit owner approval", () => {
    delete process.env.ALLOW_LIVE_PAYMENTS;
    expect(() => new StripeProvider("sk_live_123", "whsec_x")).toThrow(LivePaymentsBlockedError);
  });
});
