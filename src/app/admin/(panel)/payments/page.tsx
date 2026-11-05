import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { formatCents } from "@/lib/domain/money";
import { AdminHeader, Badge, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Payments" };

const STATUSES = ["ALL", "SUCCEEDED", "CREATED", "FAILED", "EXPIRED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireStaffPage("payments:view");
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(String(sp.status)) ? String(sp.status) : "ALL";
  const s = await getSettings();
  const db = getDb();
  const rows = await db
    .select({ p: schema.payments, ref: schema.orders.reference, name: schema.orders.customerName, orderId: schema.orders.id })
    .from(schema.payments)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
    .where(status === "ALL" ? undefined : sql`${schema.payments.status} = ${status}`)
    .orderBy(desc(schema.payments.createdAt))
    .limit(300);
  const [totals] = await db
    .select({ received: sql<number>`coalesce(sum(${schema.payments.amountCents}) filter (where ${schema.payments.status} in ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0)::int`, refunded: sql<number>`coalesce(sum(${schema.payments.refundedCents}),0)::int` })
    .from(schema.payments);
  const dt = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(d);
  const live = (process.env.PAYMENT_PROVIDER ?? "demo") === "stripe" && process.env.ALLOW_LIVE_PAYMENTS === "true";
  return (
    <>
      <AdminHeader
        title="Payments"
        intro={
          <>
            Received {formatCents(totals.received)} · refunded {formatCents(totals.refunded)}.{" "}
            <Badge tone={live ? "danger" : "warning"}>{live ? "LIVE payments" : `Test mode (${process.env.PAYMENT_PROVIDER ?? "demo"})`}</Badge>
          </>
        }
      />
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((st) => (
          <Link key={st} href={`/admin/payments?status=${st}`} aria-current={status === st ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${status === st ? "bg-gold text-gold-ink" : "border border-line text-muted"}`}>
            {st === "ALL" ? "All" : st.replace("_", " ").toLowerCase()}
          </Link>
        ))}
      </nav>
      <Panel>
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2">When</th>
                <th scope="col" className="py-2">Order</th>
                <th scope="col" className="py-2">Provider</th>
                <th scope="col" className="py-2">Status</th>
                <th scope="col" className="py-2 text-right">Amount</th>
                <th scope="col" className="py-2 text-right">Refunded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map(({ p, ref, name, orderId }) => (
                <tr key={p.id}>
                  <td className="py-2">{dt(p.createdAt)}</td>
                  <td className="py-2">
                    <Link href={`/admin/orders/${orderId}`} className="text-gold underline">
                      {ref}
                    </Link>{" "}
                    {name}
                  </td>
                  <td className="py-2">
                    {p.provider}
                    <span className="block max-w-56 truncate text-xs text-muted">{p.providerPaymentId ?? p.providerSessionId}</span>
                  </td>
                  <td className="py-2">
                    <Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "CREATED" ? "warning" : p.status.includes("REFUND") ? "danger" : "neutral"}>{p.status.replace("_", " ").toLowerCase()}</Badge>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatCents(p.amountCents)}</td>
                  <td className="py-2 text-right tabular-nums">{p.refundedCents ? formatCents(p.refundedCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="py-8 text-center text-muted">No payments.</p> : null}
        </div>
      </Panel>
    </>
  );
}
