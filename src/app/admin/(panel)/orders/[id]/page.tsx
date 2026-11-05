import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/server/auth";
import { orderDetail } from "@/lib/server/admin-orders";
import { getSettings } from "@/lib/server/settings";
import { can } from "@/lib/domain/permissions";
import { STATUS_LABEL, TRANSITIONS } from "@/lib/domain/order-status";
import { formatCents } from "@/lib/domain/money";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { toTelHref } from "@/lib/config/business";
import { AdminHeader, Badge, Panel } from "@/components/admin/ui";
import { OrderControls, RefundForm, ResendButtons } from "@/components/admin/widgets";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await requireStaffPage("orders:view");
  const { id } = await params;
  const [o, s] = await Promise.all([orderDetail(id), getSettings()]);
  if (!o) notFound();
  const jobs = await getDb().select().from(schema.notificationJobs).where(eq(schema.notificationJobs.orderId, o.id)).orderBy(desc(schema.notificationJobs.createdAt));
  const dt = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(d);
  const succeeded = o.payments.filter((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED");
  const paidCents = succeeded.reduce((n, p) => n + p.amountCents, 0);
  const refundable = paidCents - o.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + r.amountCents, 0);

  return (
    <>
      <AdminHeader
        title={`${o.reference} · ${o.customerName}`}
        intro={
          <>
            <Badge tone={o.status === "CANCELLED" || o.status === "REFUNDED" ? "danger" : o.status === "NEW" ? "maroon" : "gold"}>{STATUS_LABEL[o.status]}</Badge> Pickup {formatDateLong(o.pickupDate)} at {formatTime12(o.pickupTime)}
          </>
        }
        actions={
          <Link href="/admin/orders" className="text-sm text-muted underline">
            Back to orders
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-line/70">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5">
                  <span>
                    <strong>{i.quantity} ×</strong> {i.name}
                    {i.options.length ? <span className="block text-sm text-muted">{i.options.map((x) => `${x.group}: ${x.choice}`).join(" · ")}</span> : null}
                  </span>
                  <span className="tabular-nums">{formatCents(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
              <span>Total{o.gstCents ? ` (incl. GST ${formatCents(o.gstCents)})` : ""}</span>
              <span className="tabular-nums">{formatCents(o.totalCents)}</span>
            </div>
            {o.notes ? <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">Customer note: {o.notes}</p> : null}
          </Panel>
          <Panel title="Customer">
            <p className="font-semibold">{o.customerName}</p>
            <p>
              <a href={toTelHref(o.customerPhone)} className="text-gold underline">
                {o.customerPhone}
              </a>{" "}
              ·{" "}
              <a href={`mailto:${o.customerEmail}`} className="text-gold underline">
                {o.customerEmail}
              </a>
            </p>
            {can(user.role, "customers:view") ? (
              <Link href={`/admin/customers/${encodeURIComponent(o.customerEmail)}`} className="mt-2 inline-block text-sm text-muted underline">
                Customer history
              </Link>
            ) : null}
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-2 text-sm">
              {o.events.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3">
                  <span className="text-muted tabular-nums">{dt(e.at)}</span>
                  <span className="font-semibold">{STATUS_LABEL[e.toStatus]}</span>
                  <span className="text-muted">by {e.actor ?? "system"}</span>
                  {e.note ? <span className="w-full text-muted">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Actions">
            <OrderControls
              orderId={o.id}
              status={o.status}
              allowed={TRANSITIONS[o.status]}
              canCancel={can(user.role, "orders:cancel")}
              canReconcile={can(user.role, "payments:reconcile")}
              attention={o.attentionReason}
              hasOpenPayment={o.payments.some((p) => p.status === "CREATED")}
            />
          </Panel>
          {can(user.role, "payments:view") ? (
            <Panel title="Payments">
              {o.payments.length ? (
                <ul className="space-y-2 text-sm">
                  {o.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {p.provider} · {p.status.replace("_", " ").toLowerCase()} · {dt(p.createdAt)}
                        <span className="block break-all text-xs text-muted">{p.providerPaymentId ?? p.providerSessionId}</span>
                      </span>
                      <span className="tabular-nums">{formatCents(p.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No payment attempts.</p>
              )}
              {o.refunds.length ? (
                <>
                  <h3 className="mt-4 font-semibold">Refunds</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {o.refunds.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <span>
                          {dt(r.createdAt)} · {r.status.toLowerCase()} · {r.createdBy}
                          {r.reason ? ` · ${r.reason}` : ""}
                        </span>
                        <span className="tabular-nums">−{formatCents(r.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Panel>
          ) : null}
          {can(user.role, "notifications:manage") && o.paidAt ? (
            <Panel title="Messages to the customer">
              {jobs.length ? (
                <ul className="mb-4 space-y-1 text-sm">
                  {jobs.map((j) => (
                    <li key={j.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {j.template.replace(/_/g, " ")} ({j.channel.toLowerCase()})
                      </span>
                      <span className={j.status === "FAILED" ? "text-danger" : j.status === "SENT" ? "text-success" : "text-muted"}>
                        {j.status.toLowerCase()} {j.status === "SENT" && j.sentAt ? dt(j.sentAt) : j.status === "PENDING" ? dt(j.runAt) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-sm text-muted">No messages yet.</p>
              )}
              <ResendButtons
                orderId={o.id}
                options={[
                  { template: "order_confirmed", label: "confirmation" },
                  ...(o.status === "READY" ? [{ template: "order_ready" as const, label: "ready for pickup" }] : []),
                  ...(o.status === "CANCELLED" ? [{ template: "order_cancelled" as const, label: "cancellation" }] : []),
                ]}
              />
            </Panel>
          ) : null}
          {can(user.role, "orders:refund") && paidCents > 0 ? (
            <Panel title="Refund">
              <RefundForm orderId={o.id} refundableCents={refundable} canCancel={can(user.role, "orders:cancel") && TRANSITIONS[o.status].includes("CANCELLED")} />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
