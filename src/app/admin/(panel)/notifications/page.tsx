import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { getEmailSender, getSmsSender } from "@/lib/server/messaging";
import { AdminHeader, Badge, Panel, Stat } from "@/components/admin/ui";
import { NotificationSettingsForm } from "@/components/admin/SettingsForms";
import { JobButtons, TestEmailForm } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Notifications" };

const STATUS = ["ALL", "PENDING", "SENDING", "SENT", "FAILED", "CANCELLED"] as const;
const LABEL: Record<string, string> = {
  order_confirmed: "Order confirmed",
  order_accepted: "Accepted by kitchen",
  order_ready: "Ready for pickup",
  order_cancelled: "Cancelled",
  order_refunded: "Refunded",
  order_partially_refunded: "Partial refund",
  pickup_reminder: "Pickup reminder",
  owner_new_order: "New order (to you)",
  test: "Test",
};

export default async function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  await requireStaffPage("notifications:manage");
  const sp = await searchParams;
  const status = (STATUS as readonly string[]).includes(String(sp.status)) ? String(sp.status) : "ALL";
  const s = await getSettings();
  const db = getDb();
  const jobs = await db
    .select({ j: schema.notificationJobs, ref: schema.orders.reference })
    .from(schema.notificationJobs)
    .leftJoin(schema.orders, eq(schema.orders.id, schema.notificationJobs.orderId))
    .where(status === "ALL" ? undefined : sql`${schema.notificationJobs.status} = ${status}`)
    .orderBy(desc(schema.notificationJobs.createdAt))
    .limit(200);
  const [counts] = await db
    .select({
      sent: sql<number>`count(*) filter (where status = 'SENT')::int`,
      pending: sql<number>`count(*) filter (where status in ('PENDING','SENDING'))::int`,
      failed: sql<number>`count(*) filter (where status = 'FAILED')::int`,
    })
    .from(schema.notificationJobs);
  const email = getEmailSender();
  const sms = getSmsSender();
  const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-AU", { dateStyle: "short", timeStyle: "short", timeZone: s.timezone }).format(d) : "—");
  const mask = (r: string) => (r.includes("@") ? r.replace(/^(.{2}).*(@.*)$/, "$1…$2") : r.replace(/^(.{4}).*(.{3})$/, "$1 … $2"));

  return (
    <>
      <AdminHeader title="Notifications" intro={`Email: ${email.configured ? email.name : "not configured (messages are logged only)"} · SMS: ${sms.configured ? sms.name : "not configured"}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Sent" value={counts.sent} />
        <Stat label="Waiting / scheduled" value={counts.pending} hint="Includes pickup reminders" />
        <Stat label="Failed" value={counts.failed} hint={counts.failed ? "Retry below" : undefined} />
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Panel title="What gets sent">
          <NotificationSettingsForm
            initial={{ notifyEmailEnabled: s.notifyEmailEnabled, notifySmsEnabled: s.notifySmsEnabled, notifyOwnerNewOrder: s.notifyOwnerNewOrder, ownerNotifyEmail: s.ownerNotifyEmail, reminderHoursBefore: s.reminderHoursBefore }}
            emailConfigured={email.configured}
            smsConfigured={sms.configured}
          />
        </Panel>
        <Panel title="Check it works">
          <TestEmailForm defaultTo={s.ownerNotifyEmail ?? s.email ?? ""} />
          <p className="mt-3 text-sm text-muted">Messages retry automatically up to 6 times (after 1, 5, 15, 60 and 180 minutes) and are never sent twice.</p>
        </Panel>
      </div>
      <nav aria-label="Filter by status" className="mb-3 flex flex-wrap gap-1">
        {STATUS.map((st) => (
          <Link key={st} href={`/admin/notifications?status=${st}`} aria-current={status === st ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${status === st ? "bg-gold text-gold-ink" : "border border-line text-muted"}`}>
            {st === "ALL" ? "All" : st.toLowerCase()}
          </Link>
        ))}
      </nav>
      <Panel title="Delivery log">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2">Message</th>
                <th scope="col" className="py-2">To</th>
                <th scope="col" className="py-2">Order</th>
                <th scope="col" className="py-2">Status</th>
                <th scope="col" className="py-2">Scheduled / sent</th>
                <th scope="col" className="py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 align-top">
              {jobs.map(({ j, ref }) => (
                <tr key={j.id}>
                  <td className="py-2">
                    {LABEL[j.template] ?? j.template} <span className="text-xs text-muted">({j.channel.toLowerCase()})</span>
                    {j.lastError ? <span className="block max-w-xs text-xs text-danger">{j.lastError}</span> : null}
                  </td>
                  <td className="py-2">{mask(j.recipient)}</td>
                  <td className="py-2">{ref && j.orderId ? <Link href={`/admin/orders/${j.orderId}`} className="text-gold underline">{ref}</Link> : "—"}</td>
                  <td className="py-2">
                    <Badge tone={j.status === "SENT" ? "success" : j.status === "FAILED" ? "danger" : j.status === "CANCELLED" ? "neutral" : "warning"}>{j.status.toLowerCase()}</Badge>
                    {j.attempts > 1 ? <span className="block text-xs text-muted">{j.attempts} attempts</span> : null}
                  </td>
                  <td className="py-2">{j.status === "SENT" ? fmt(j.sentAt) : fmt(j.runAt)}</td>
                  <td className="py-2">
                    <JobButtons id={j.id} status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 ? <p className="py-8 text-center text-muted">No notifications yet.</p> : null}
        </div>
      </Panel>
    </>
  );
}
