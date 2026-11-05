import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/server/auth";
import { customerDetail } from "@/lib/server/admin-misc";
import { can } from "@/lib/domain/permissions";
import { formatCents } from "@/lib/domain/money";
import { formatDateShort } from "@/lib/domain/time";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { toTelHref } from "@/lib/config/business";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { CustomerNote } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[email]">) {
  const user = await requireStaffPage("customers:view");
  const email = decodeURIComponent((await params).email);
  const { orders, account } = await customerDetail(email);
  if (!orders.length && !account) notFound();
  const latest = orders[0];
  const paid = orders.filter((o) => o.paidAt);
  return (
    <>
      <AdminHeader title={latest?.customerName ?? account?.name ?? email} intro={`${paid.length} paid orders · ${formatCents(paid.reduce((n, o) => n + o.totalCents - o.refundedCents, 0))} spent`} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Orders">
          <ul className="divide-y divide-line/60">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-gold">
                  {o.reference} · {formatDateShort(o.pickupDate)}
                </Link>
                <span>
                  {STATUS_LABEL[o.status]} · {formatCents(o.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-6">
          <Panel title="Contact">
            <p>
              <a href={`mailto:${email}`} className="text-gold underline">
                {email}
              </a>
            </p>
            {latest ? (
              <p>
                <a href={toTelHref(latest.customerPhone)} className="text-gold underline">
                  {latest.customerPhone}
                </a>
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted">{account?.passwordHash ? "Has an online account" : "Guest customer"}</p>
          </Panel>
          {can(user.role, "customers:edit") ? (
            <Panel title="Private notes">
              <CustomerNote email={email} initial={account?.notes ?? ""} />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
