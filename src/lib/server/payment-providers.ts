import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/** Provider-neutral event: the only thing that may move an order to "paid" */
export type PaymentEvent =
  | { id: string; type: "payment.succeeded"; sessionId: string; paymentId: string | null; amountCents: number; currency: string }
  | { id: string; type: "payment.failed"; sessionId: string; reason: string }
  | { id: string; type: "checkout.expired"; sessionId: string }
  | { id: string; type: "refund.updated"; refundId: string; status: "SUCCEEDED" | "FAILED" | "PENDING" }
  | { id: string; type: "ignored"; reason: string };

export type SessionState = { status: "open" | "paid" | "failed" | "expired" | "cancelled"; paymentId: string | null; amountCents: number; currency: string };

export interface PaymentProvider {
  readonly name: "stripe" | "demo" | "memory";
  readonly isTestMode: boolean;
  createCheckout(p: {
    orderId: string;
    reference: string;
    amountCents: number;
    lines: { name: string; unitAmountCents: number; quantity: number }[];
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    expiresAt: Date;
    idempotencyKey: string;
  }): Promise<{ sessionId: string; url: string }>;
  retrieveSession(sessionId: string): Promise<SessionState>;
  expireSession(sessionId: string): Promise<void>;
  refund(p: { paymentId: string; amountCents: number; idempotencyKey: string; reason?: string }): Promise<{ refundId: string; status: "SUCCEEDED" | "PENDING" | "FAILED" }>;
  /** Verifies the signature and normalises the event. Throws WebhookSignatureError on any doubt. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}

export class WebhookSignatureError extends Error {}
export class LivePaymentsBlockedError extends Error {}

/* ---------------- Stripe ---------------- */

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  readonly isTestMode: boolean;
  private stripe: Stripe;
  constructor(
    private secretKey: string,
    private webhookSecret: string,
  ) {
    this.isTestMode = secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_");
    if (!this.isTestMode && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
      throw new LivePaymentsBlockedError("Live Stripe keys are configured but ALLOW_LIVE_PAYMENTS is not 'true'. Live payments need explicit owner approval.");
    }
    this.stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
  }

  async createCheckout(p: Parameters<PaymentProvider["createCheckout"]>[0]) {
    // Stripe requires checkout sessions to live at least 30 minutes
    const expires = Math.max(Math.floor(p.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + 31 * 60);
    const s = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        currency: "aud",
        customer_email: p.customerEmail,
        client_reference_id: p.orderId,
        metadata: { orderId: p.orderId, reference: p.reference },
        payment_intent_data: { metadata: { orderId: p.orderId, reference: p.reference }, description: `Diwaan Shah Khwaan order ${p.reference}` },
        line_items: p.lines.map((l) => ({ quantity: l.quantity, price_data: { currency: "aud", unit_amount: l.unitAmountCents, product_data: { name: l.name } } })),
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        expires_at: expires,
      },
      { idempotencyKey: p.idempotencyKey },
    );
    if (!s.url) throw new Error("Stripe did not return a checkout URL");
    if (s.amount_total !== p.amountCents) throw new Error(`Stripe total ${s.amount_total} does not match order total ${p.amountCents}`);
    return { sessionId: s.id, url: s.url };
  }

  async retrieveSession(id: string): Promise<SessionState> {
    const s = await this.stripe.checkout.sessions.retrieve(id);
    const status: SessionState["status"] = s.payment_status === "paid" ? "paid" : s.status === "expired" ? "expired" : "open";
    return { status, paymentId: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null), amountCents: s.amount_total ?? 0, currency: s.currency ?? "aud" };
  }

  async expireSession(id: string) {
    try {
      await this.stripe.checkout.sessions.expire(id);
    } catch {
      /* already completed or expired */
    }
  }

  async refund(p: Parameters<PaymentProvider["refund"]>[0]) {
    const r = await this.stripe.refunds.create({ payment_intent: p.paymentId, amount: p.amountCents, metadata: { reason: p.reason ?? "" } }, { idempotencyKey: p.idempotencyKey });
    return { refundId: r.id, status: r.status === "succeeded" ? ("SUCCEEDED" as const) : r.status === "failed" || r.status === "canceled" ? ("FAILED" as const) : ("PENDING" as const) };
  }

  async parseWebhook(raw: string, headers: Headers): Promise<PaymentEvent> {
    const sig = headers.get("stripe-signature");
    if (!sig || !this.webhookSecret) throw new WebhookSignatureError("Missing signature");
    let e: Stripe.Event;
    try {
      e = this.stripe.webhooks.constructEvent(raw, sig, this.webhookSecret);
    } catch (err) {
      throw new WebhookSignatureError((err as Error).message);
    }
    return mapStripeEvent(e);
  }
}

export function mapStripeEvent(e: Stripe.Event): PaymentEvent {
  switch (e.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = e.data.object as Stripe.Checkout.Session;
      if (s.payment_status !== "paid") return { id: e.id, type: "ignored", reason: `payment_status=${s.payment_status}` };
      return { id: e.id, type: "payment.succeeded", sessionId: s.id, paymentId: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null), amountCents: s.amount_total ?? 0, currency: s.currency ?? "" };
    }
    case "checkout.session.async_payment_failed": {
      const s = e.data.object as Stripe.Checkout.Session;
      return { id: e.id, type: "payment.failed", sessionId: s.id, reason: "Payment failed" };
    }
    case "checkout.session.expired": {
      const s = e.data.object as Stripe.Checkout.Session;
      return { id: e.id, type: "checkout.expired", sessionId: s.id };
    }
    case "refund.updated":
    case "refund.created": {
      const r = e.data.object as Stripe.Refund;
      return { id: e.id, type: "refund.updated", refundId: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" || r.status === "canceled" ? "FAILED" : "PENDING" };
    }
    default:
      return { id: e.id, type: "ignored", reason: e.type };
  }
}

/* ---------------- Demo (staging only; never takes money) ---------------- */

export class DemoProvider implements PaymentProvider {
  readonly name = "demo" as const;
  readonly isTestMode = true;
  constructor(private secret: string) {
    if (!secret || secret.length < 24) throw new Error("DEMO_PAYMENT_SECRET must be at least 24 characters");
  }
  private sign(body: string) {
    return createHmac("sha256", this.secret).update(body).digest("hex");
  }
  /** Builds a signed webhook exactly as an external provider would send it */
  signedEvent(event: Record<string, unknown>): { body: string; headers: Headers } {
    const body = JSON.stringify(event);
    return { body, headers: new Headers({ "x-demo-signature": this.sign(body) }) };
  }

  async createCheckout(p: Parameters<PaymentProvider["createCheckout"]>[0]) {
    const db = getDb();
    const id = "demo_cs_" + randomBytes(12).toString("hex");
    await db.insert(schema.demoPaymentSessions).values({ id, orderReference: p.reference, amountCents: p.amountCents, expiresAt: p.expiresAt });
    const base = new URL(p.successUrl).origin;
    return { sessionId: id, url: `${base}/pay/demo/${id}` };
  }
  async retrieveSession(id: string): Promise<SessionState> {
    const [s] = await getDb().select().from(schema.demoPaymentSessions).where(eq(schema.demoPaymentSessions.id, id));
    if (!s) throw new Error("Unknown demo session");
    const status = s.status === "open" && s.expiresAt < new Date() ? "expired" : s.status;
    return { status, paymentId: s.paymentId, amountCents: s.amountCents, currency: s.currency };
  }
  async expireSession(id: string) {
    await getDb().update(schema.demoPaymentSessions).set({ status: "expired" }).where(eq(schema.demoPaymentSessions.id, id));
  }
  async refund(p: Parameters<PaymentProvider["refund"]>[0]) {
    return { refundId: "demo_re_" + createHmac("sha256", this.secret).update(p.idempotencyKey).digest("hex").slice(0, 20), status: "SUCCEEDED" as const };
  }
  async parseWebhook(raw: string, headers: Headers): Promise<PaymentEvent> {
    const sig = headers.get("x-demo-signature") ?? "";
    const expected = this.sign(raw);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new WebhookSignatureError("Bad demo signature");
    const e = JSON.parse(raw) as PaymentEvent;
    return e;
  }
}

/* ---------------- Selection ---------------- */

let override: PaymentProvider | null = null;
export function setPaymentProviderForTests(p: PaymentProvider | null) {
  override = p;
}

export function getPaymentProvider(name?: string): PaymentProvider {
  if (override && (!name || name === override.name)) return override;
  const which = name ?? process.env.PAYMENT_PROVIDER ?? "demo";
  if (which === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    return new StripeProvider(key, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  }
  if (which === "demo") return new DemoProvider(process.env.DEMO_PAYMENT_SECRET ?? "");
  throw new Error(`Unknown payment provider: ${which}`);
}
