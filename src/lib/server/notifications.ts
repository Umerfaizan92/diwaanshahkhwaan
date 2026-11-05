import "server-only";
import { and, asc, eq, inArray, lt, lte, or, sql } from "drizzle-orm";
import { getDb, schema, type DB, type DbOrTx } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/domain/order-status";
import { renderTemplate, type TemplateName } from "./email-templates";
import { getEmailSender, getSmsSender } from "./messaging";
import { appUrl } from "@/lib/config/app-url";

export type OrderNotice = "order_confirmed" | "order_accepted" | "order_ready" | "order_cancelled" | "order_refunded" | "order_partially_refunded" | "pickup_reminder";

const SMS_KINDS: OrderNotice[] = ["order_ready", "order_cancelled", "pickup_reminder"];
/** Retry backoff after attempt n (minutes) */
const BACKOFF_MIN = [1, 5, 15, 60, 180];


type JobInsert = typeof schema.notificationJobs.$inferInsert;

async function enqueue(db: DbOrTx, jobs: JobInsert[]) {
  if (!jobs.length) return;
  // The unique dedupe key makes every logical notification send at most once
  await db.insert(schema.notificationJobs).values(jobs).onConflictDoNothing({ target: schema.notificationJobs.dedupeKey });
}

/**
 * Queues notifications for an order event inside the caller's transaction, so a notification
 * exists if and only if the state change committed.
 */
export async function notifyOrder(db: DbOrTx, orderId: string, kind: OrderNotice, data: Record<string, unknown> = {}): Promise<void> {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  const [s] = await db.select().from(schema.businessSettings);
  if (!order || !s) return;
  const suffix = kind === "order_partially_refunded" && typeof data.refundId === "string" ? `:${data.refundId}` : "";
  const jobs: JobInsert[] = [];
  if (s.notifyEmailEnabled) jobs.push({ dedupeKey: `${kind}:${orderId}${suffix}:EMAIL`, channel: "EMAIL", template: kind, recipient: order.customerEmail, orderId, payload: data });
  if (s.notifySmsEnabled && order.smsOptIn && SMS_KINDS.includes(kind)) jobs.push({ dedupeKey: `${kind}:${orderId}${suffix}:SMS`, channel: "SMS", template: kind, recipient: order.customerPhone, orderId, payload: data });

  if (kind === "order_confirmed") {
    if (s.notifyOwnerNewOrder && s.ownerNotifyEmail) jobs.push({ dedupeKey: `owner_new_order:${orderId}:EMAIL`, channel: "EMAIL", template: "owner_new_order", recipient: s.ownerNotifyEmail, orderId });
    if (s.reminderHoursBefore > 0) {
      const runAt = new Date(order.pickupAt.getTime() - s.reminderHoursBefore * 3600_000);
      if (runAt.getTime() > Date.now() + 30 * 60_000) {
        if (s.notifyEmailEnabled) jobs.push({ dedupeKey: `pickup_reminder:${orderId}:EMAIL`, channel: "EMAIL", template: "pickup_reminder", recipient: order.customerEmail, orderId, runAt });
        if (s.notifySmsEnabled && order.smsOptIn) jobs.push({ dedupeKey: `pickup_reminder:${orderId}:SMS`, channel: "SMS", template: "pickup_reminder", recipient: order.customerPhone, orderId, runAt });
      }
    }
  }
  if (kind === "order_cancelled" || kind === "order_refunded") {
    await db
      .update(schema.notificationJobs)
      .set({ status: "CANCELLED", lastError: "Order cancelled" })
      .where(and(eq(schema.notificationJobs.orderId, orderId), eq(schema.notificationJobs.status, "PENDING"), inArray(schema.notificationJobs.template, ["pickup_reminder", "order_ready", "order_accepted"])));
  }
  await enqueue(db, jobs);
}

/** Staff "resend": a fresh job with its own dedupe key */
export async function resendNotification(db: DB, orderId: string, template: OrderNotice | "owner_new_order"): Promise<void> {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order) return;
  await enqueue(db, [{ dedupeKey: `${template}:${orderId}:EMAIL:resend:${Date.now()}`, channel: "EMAIL", template, recipient: order.customerEmail, orderId }]);
}

export async function queueTestEmail(db: DB, to: string): Promise<void> {
  await enqueue(db, [{ dedupeKey: `test:${to}:${Date.now()}`, channel: "EMAIL", template: "test", recipient: to }]);
}

/**
 * Durable worker: claims due jobs with SKIP LOCKED (safe across several instances), sends them,
 * and records the outcome. Failures retry with backoff; crashed sends are reclaimed after a lease.
 */
export async function processNotificationJobs(opts: { now?: Date; limit?: number; db?: DB } = {}): Promise<{ sent: number; failed: number; retried: number; skipped: number }> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const lease = new Date(now.getTime() + 2 * 60_000);
  const claimed = await db
    .update(schema.notificationJobs)
    .set({ status: "SENDING", lockedUntil: lease, attempts: sql`${schema.notificationJobs.attempts} + 1` })
    .where(
      inArray(
        schema.notificationJobs.id,
        db
          .select({ id: schema.notificationJobs.id })
          .from(schema.notificationJobs)
          .where(or(and(eq(schema.notificationJobs.status, "PENDING"), lte(schema.notificationJobs.runAt, now)), and(eq(schema.notificationJobs.status, "SENDING"), lt(schema.notificationJobs.lockedUntil, now))))
          .orderBy(asc(schema.notificationJobs.runAt))
          .limit(opts.limit ?? 25)
          .for("update", { skipLocked: true }),
      ),
    )
    .returning();

  const result = { sent: 0, failed: 0, retried: 0, skipped: 0 };
  if (!claimed.length) return result;
  const [settings] = await db.select().from(schema.businessSettings);

  for (const job of claimed) {
    const finish = (set: Partial<typeof schema.notificationJobs.$inferInsert>) => db.update(schema.notificationJobs).set({ lockedUntil: null, ...set }).where(and(eq(schema.notificationJobs.id, job.id), eq(schema.notificationJobs.status, "SENDING")));
    try {
      let order = null;
      if (job.orderId) {
        order = await db.query.orders.findFirst({ where: eq(schema.orders.id, job.orderId), with: { items: true } });
        if (!order) {
          await finish({ status: "CANCELLED", lastError: "Order no longer exists" });
          result.skipped++;
          continue;
        }
        // Reminders and "ready" messages only make sense for live orders
        if ((job.template === "pickup_reminder" || job.template === "order_ready") && !ACTIVE_STATUSES.includes(order.status)) {
          await finish({ status: "CANCELLED", lastError: `Order is ${order.status}` });
          result.skipped++;
          continue;
        }
        if (job.template === "pickup_reminder" && order.status === "COLLECTED") {
          await finish({ status: "CANCELLED", lastError: "Already collected" });
          result.skipped++;
          continue;
        }
      }
      const channelOn = job.channel === "EMAIL" ? settings.notifyEmailEnabled || job.template === "test" || job.template === "owner_new_order" : settings.notifySmsEnabled;
      if (!channelOn) {
        await finish({ status: "CANCELLED", lastError: `${job.channel} notifications are switched off` });
        result.skipped++;
        continue;
      }
      const orderUrl = order ? `${appUrl()}/order/${order.reference}?t=${order.trackingToken}` : appUrl();
      const r = renderTemplate(job.template as TemplateName, { order: order as never, settings, orderUrl, adminUrl: order ? `${appUrl()}/admin/orders/${order.id}` : `${appUrl()}/admin`, extra: job.payload ?? {} });
      const sent = job.channel === "EMAIL" ? await getEmailSender().send({ to: job.recipient, subject: r.subject, html: r.html, text: r.text, idempotencyKey: job.id }) : await getSmsSender().send({ to: job.recipient, body: r.sms, idempotencyKey: job.id });
      if (sent.ok) {
        await finish({ status: "SENT", sentAt: new Date(), providerMessageId: sent.id, lastError: null });
        result.sent++;
      } else if (sent.permanent || job.attempts >= job.maxAttempts) {
        await finish({ status: "FAILED", lastError: sent.error });
        result.failed++;
      } else {
        const wait = BACKOFF_MIN[Math.min(job.attempts - 1, BACKOFF_MIN.length - 1)];
        await finish({ status: "PENDING", runAt: new Date(now.getTime() + wait * 60_000), lastError: sent.error });
        result.retried++;
      }
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 500) ?? "error";
      if (job.attempts >= job.maxAttempts) {
        await finish({ status: "FAILED", lastError: msg });
        result.failed++;
      } else {
        await finish({ status: "PENDING", runAt: new Date(now.getTime() + BACKOFF_MIN[Math.min(job.attempts - 1, BACKOFF_MIN.length - 1)] * 60_000), lastError: msg });
        result.retried++;
      }
    }
  }
  return result;
}

export async function retryJob(db: DB, id: string): Promise<boolean> {
  const r = await db
    .update(schema.notificationJobs)
    .set({ status: "PENDING", runAt: new Date(), attempts: 0, lastError: null })
    .where(and(eq(schema.notificationJobs.id, id), inArray(schema.notificationJobs.status, ["FAILED", "CANCELLED"])))
    .returning();
  return r.length > 0;
}

export async function cancelJob(db: DB, id: string): Promise<boolean> {
  const r = await db.update(schema.notificationJobs).set({ status: "CANCELLED", lastError: "Cancelled by staff" }).where(and(eq(schema.notificationJobs.id, id), eq(schema.notificationJobs.status, "PENDING"))).returning();
  return r.length > 0;
}
