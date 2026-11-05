"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DemoProvider } from "@/lib/server/payment-providers";
import { ingestWebhook, orderUrl } from "@/lib/server/payments";

/**
 * Simulates what a hosted payment page + provider webhook do. The app learns the outcome ONLY
 * through the signed webhook below — exactly the same code path real payments use.
 */
export async function demoOutcome(sessionId: string, outcome: "pay" | "decline" | "cancel") {
  if (process.env.PAYMENT_PROVIDER !== "demo") throw new Error("Demo payments are disabled");
  const db = getDb();
  const [s] = await db.select().from(schema.demoPaymentSessions).where(eq(schema.demoPaymentSessions.id, sessionId));
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.providerSessionId, sessionId));
  if (!s || !payment) redirect("/");
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, payment.orderId));
  const provider = new DemoProvider(process.env.DEMO_PAYMENT_SECRET ?? "");
  const cancelUrl = `/checkout/cancelled?ref=${order.reference}&t=${order.trackingToken}`;

  if (s.status !== "open" || s.expiresAt < new Date()) redirect(orderUrl(order));

  if (outcome === "cancel") redirect(cancelUrl);

  if (outcome === "decline") {
    await db.update(schema.demoPaymentSessions).set({ status: "failed" }).where(eq(schema.demoPaymentSessions.id, sessionId));
    const { body, headers } = provider.signedEvent({ id: "evt_demo_" + randomBytes(8).toString("hex"), type: "payment.failed", sessionId, reason: "Card declined (test)" });
    await ingestWebhook("demo", body, headers);
    redirect(cancelUrl + "&declined=1");
  }

  const paymentId = "demo_pi_" + randomBytes(10).toString("hex");
  await db.update(schema.demoPaymentSessions).set({ status: "paid", paymentId }).where(eq(schema.demoPaymentSessions.id, sessionId));
  const { body, headers } = provider.signedEvent({ id: "evt_demo_" + randomBytes(8).toString("hex"), type: "payment.succeeded", sessionId, paymentId, amountCents: s.amountCents, currency: s.currency });
  await ingestWebhook("demo", body, headers);
  redirect(orderUrl(order, "&from=payment"));
}
