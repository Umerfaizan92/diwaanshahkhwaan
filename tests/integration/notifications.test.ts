import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { resetDb, closeDb, owner } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { createReservation } from "@/lib/server/orders";
import { handlePaymentEvent, refundOrder, startPayment } from "@/lib/server/payments";
import { setPaymentProviderForTests, type PaymentProvider } from "@/lib/server/payment-providers";
import { processNotificationJobs, retryJob } from "@/lib/server/notifications";
import { setSendersForTests, type EmailSender, type SmsSender, type SendResult } from "@/lib/server/messaging";
import { staffTransition } from "@/lib/server/admin-orders";
import { renderTemplate } from "@/lib/server/email-templates";

class FakeEmail implements EmailSender {
  readonly name = "fake";
  readonly configured = true;
  sent: { to: string; subject: string; html: string; key: string }[] = [];
  queue: SendResult[] = [];
  async send(m: { to: string; subject: string; html: string; idempotencyKey: string }) {
    const r = this.queue.shift() ?? { ok: true as const, id: `msg_${this.sent.length + 1}` };
    if (r.ok) this.sent.push({ to: m.to, subject: m.subject, html: m.html, key: m.idempotencyKey });
    await new Promise((res) => setTimeout(res, 5));
    return r;
  }
}
class FakeSms implements SmsSender {
  readonly name = "fake";
  readonly configured = true;
  sent: { to: string; body: string }[] = [];
  async send(m: { to: string; body: string }) {
    this.sent.push(m);
    return { ok: true as const, id: "sms" };
  }
}

const provider = {
  name: "memory",
  isTestMode: true,
  createCheckout: async () => ({ sessionId: "s_" + randomUUID(), url: "https://pay.example" }),
  retrieveSession: async () => ({ status: "open", paymentId: null, amountCents: 0, currency: "aud" }),
  expireSession: async () => {},
  refund: async (p: { idempotencyKey: string }) => ({ refundId: "re_" + p.idempotencyKey, status: "SUCCEEDED" }),
  parseWebhook: async () => {
    throw new Error("unused");
  },
} as unknown as PaymentProvider;

let db: DB;
let email: FakeEmail;
let sms: FakeSms;
let biryaniId = "";
let mediumId = "";

beforeAll(async () => {
  db = await resetDb();
  setPaymentProviderForTests(provider);
  await db.update(schema.businessSettings).set({ minNoticeHours: 0, orderCutoffTime: null, maxAdvanceDays: 30, notifyOwnerNewOrder: true, ownerNotifyEmail: "owner@dsk.example", reminderHoursBefore: 3, notifySmsEnabled: true, pickupAddress: "12 Example St, Langford WA 6147" });
  await db.update(schema.openingHours).set({ isOpen: true, openTime: "00:00", closeTime: "23:30" });
  const b = await db.query.menuItems.findFirst({ where: eq(schema.menuItems.slug, "shahi-chicken-biryani"), with: { optionGroups: { with: { choices: true } } } });
  biryaniId = b!.id;
  mediumId = b!.optionGroups[0].choices.find((c) => c.name === "Medium")!.id;
});
afterAll(async () => {
  setPaymentProviderForTests(null);
  setSendersForTests(null, null);
  await closeDb();
});
beforeEach(async () => {
  email = new FakeEmail();
  sms = new FakeSms();
  setSendersForTests(email, sms);
  await db.execute(sql`truncate orders, order_items, order_events, payments, refunds, payment_events, notification_jobs restart identity cascade`);
});

async function paidOrder(smsOptIn = false) {
  const date = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
  const r = await createReservation({ idempotencyKey: randomUUID().replace(/-/g, ""), lines: [{ menuItemId: biryaniId, quantity: 1, choiceIds: [mediumId] }], name: "Hina <script>", email: "hina@example.com", phone: "0411 222 333", pickupDate: date, pickupTime: "18:00", smsOptIn, acceptTerms: true }, { db });
  if (!r.ok) throw new Error(r.error);
  await startPayment(r.order.id, { db });
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.orderId, r.order.id));
  const ev = { id: "evt_" + p.id, type: "payment.succeeded" as const, sessionId: p.providerSessionId, paymentId: "pi_" + p.id, amountCents: 1200, currency: "aud" };
  await handlePaymentEvent("memory", ev, db);
  return { order: r.order, ev };
}
const jobs = () => db.select().from(schema.notificationJobs);

describe("queueing", () => {
  it("a paid order queues the confirmation, an owner alert and a scheduled reminder — once", async () => {
    const { ev } = await paidOrder();
    await handlePaymentEvent("memory", { ...ev, id: ev.id + "_dup" }, db); // a duplicate payment event
    const js = await jobs();
    expect(js.map((j) => j.template).sort()).toEqual(["order_confirmed", "owner_new_order", "pickup_reminder"]);
    const reminder = js.find((j) => j.template === "pickup_reminder")!;
    expect(reminder.runAt.getTime()).toBeGreaterThan(Date.now() + 86400_000);
  });

  it("sends due jobs and leaves future reminders scheduled", async () => {
    await paidOrder();
    const r = await processNotificationJobs({ db });
    expect(r).toMatchObject({ sent: 2, failed: 0 });
    expect(email.sent.map((s) => s.to).sort()).toEqual(["hina@example.com", "owner@dsk.example"]);
    expect(email.sent.find((s) => s.to === "hina@example.com")!.html).toContain("12 Example St");
    expect((await processNotificationJobs({ db })).sent).toBe(0);
    expect((await jobs()).find((j) => j.template === "pickup_reminder")!.status).toBe("PENDING");
  });

  it("escapes customer-provided text in emails", async () => {
    await paidOrder();
    await processNotificationJobs({ db });
    const owner = email.sent.find((s) => s.to === "owner@dsk.example")!;
    expect(owner.html).not.toContain("<script>");
    expect(owner.html).toContain("Hina &lt;script&gt;");
  });

  it("texts opted-in customers when the order is ready", async () => {
    const { order } = await paidOrder(true);
    for (const to of ["CONFIRMED", "PREPARING", "READY"] as const) await staffTransition(owner, order.id, to, null, db);
    await processNotificationJobs({ db });
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].body).toMatch(/READY/);
    expect(email.sent.some((e) => /ready to collect/.test(e.subject))).toBe(true);
  });

  it("cancelling cancels the pending reminder and sends a cancellation", async () => {
    const { order } = await paidOrder();
    await staffTransition(owner, order.id, "CANCELLED", "Kitchen closed", db);
    const js = await jobs();
    expect(js.find((j) => j.template === "pickup_reminder")!.status).toBe("CANCELLED");
    await processNotificationJobs({ db });
    expect(email.sent.some((e) => /cancelled/.test(e.subject))).toBe(true);
  });

  it("each partial refund gets its own email", async () => {
    const { order } = await paidOrder();
    await refundOrder(owner, { orderId: order.id, amountCents: 200, reason: "", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: false }, db);
    await refundOrder(owner, { orderId: order.id, amountCents: 300, reason: "", idempotencyKey: randomUUID().replace(/-/g, ""), cancelOrder: false }, db);
    expect((await jobs()).filter((j) => j.template === "order_partially_refunded")).toHaveLength(2);
  });
});

describe("failure and retry", () => {
  it("retries with backoff, then succeeds", async () => {
    await paidOrder();
    email.queue = [
      { ok: false, error: "timeout" },
      { ok: false, error: "timeout" },
    ];
    const now = new Date();
    const r1 = await processNotificationJobs({ db, now });
    expect(r1.retried).toBe(2);
    const failedOnce = (await jobs()).filter((j) => j.status === "PENDING" && j.template !== "pickup_reminder");
    expect(failedOnce.every((j) => j.lastError === "timeout" && j.runAt.getTime() === now.getTime() + 60_000)).toBe(true);
    expect((await processNotificationJobs({ db, now })).sent).toBe(0); // not due yet
    const r2 = await processNotificationJobs({ db, now: new Date(now.getTime() + 61_000) });
    expect(r2.sent).toBe(2);
    expect(email.sent).toHaveLength(2);
  });

  it("gives up after max attempts and can be retried by staff", async () => {
    await paidOrder();
    await db.update(schema.notificationJobs).set({ maxAttempts: 2 });
    email.queue = Array.from({ length: 4 }, () => ({ ok: false as const, error: "provider down" }));
    let t = Date.now();
    await processNotificationJobs({ db, now: new Date(t) });
    t += 10 * 60_000;
    const r = await processNotificationJobs({ db, now: new Date(t) });
    expect(r.failed).toBe(2);
    const failed = (await jobs()).filter((j) => j.status === "FAILED");
    expect(failed).toHaveLength(2);
    expect(await retryJob(db, failed[0].id)).toBe(true);
    expect((await processNotificationJobs({ db, now: new Date(t + 1000) })).sent).toBe(1);
  });

  it("permanent errors fail immediately", async () => {
    await paidOrder();
    email.queue = [{ ok: false, error: "invalid recipient", permanent: true }];
    const r = await processNotificationJobs({ db });
    expect(r.failed).toBe(1);
  });

  it("recovers jobs left SENDING by a crashed worker after the lease", async () => {
    await paidOrder();
    await db.update(schema.notificationJobs).set({ status: "SENDING", lockedUntil: new Date(Date.now() - 1000) }).where(eq(schema.notificationJobs.template, "order_confirmed"));
    const r = await processNotificationJobs({ db });
    expect(r.sent).toBe(2);
  });

  it("concurrent workers never send the same message twice", async () => {
    await paidOrder();
    await paidOrder();
    const results = await Promise.all(Array.from({ length: 5 }, () => processNotificationJobs({ db })));
    expect(results.reduce((n, r) => n + r.sent, 0)).toBe(4);
    expect(email.sent).toHaveLength(4);
    expect(new Set(email.sent.map((s) => s.key)).size).toBe(4);
  });

  it("respects the owner's switch to turn customer email off", async () => {
    await db.update(schema.businessSettings).set({ notifyEmailEnabled: false });
    await paidOrder();
    expect((await jobs()).map((j) => j.template)).toEqual(["owner_new_order"]);
    await db.update(schema.businessSettings).set({ notifyEmailEnabled: true });
  });
});

describe("templates", () => {
  it("sends a test email that has no order attached", async () => {
    const { queueTestEmail } = await import("@/lib/server/notifications");
    await queueTestEmail(db, "owner@dsk.example");
    const r = await processNotificationJobs({ db });
    expect(r).toMatchObject({ sent: 1, retried: 0 });
    expect(email.sent[0].subject).toMatch(/Test email/);
  });

  it("renders every template with a subject, HTML, text and SMS", async () => {
    const { order } = await paidOrder();
    const full = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id), with: { items: true } });
    const [settings] = await db.select().from(schema.businessSettings);
    for (const t of ["order_confirmed", "order_accepted", "order_ready", "order_cancelled", "order_refunded", "order_partially_refunded", "pickup_reminder", "owner_new_order", "test"] as const) {
      const r = renderTemplate(t, { order: full!, settings, orderUrl: "https://x/order", adminUrl: "https://x/admin", extra: { amountCents: 500, reason: "Test" } });
      expect(r.subject.length).toBeGreaterThan(5);
      expect(r.html).toContain("<!doctype html>");
      expect(r.text.length).toBeGreaterThan(10);
      expect(r.sms.length).toBeLessThanOrEqual(600);
    }
  });
});
