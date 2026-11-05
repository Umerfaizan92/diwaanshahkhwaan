import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { attentionOrders, boardOrders, dashboardStats } from "@/lib/server/admin-orders";
import { adminMenu } from "@/lib/server/menu-admin";
import { getPublicMenu, MOST_LOVED_MIN_UNITS, POPULAR_WINDOW_DAYS } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";
import { can } from "@/lib/domain/permissions";
import { addDays, formatDateShort, toZoned } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { formatCents } from "@/lib/domain/money";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { AdminHeader, Badge, Empty, Panel, Stat } from "@/components/admin/ui";
import { Alert } from "@/components/ui/Field";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const user = await requireStaffPage("dashboard:view");
  const sp = await searchParams;
  const s = await getSettings();
  const today = toZoned(new Date(), s.timezone).date;
  const [stats, attention, next, menu, publicMenu] = await Promise.all([dashboardStats(today, s.timezone), attentionOrders(), boardOrders({ from: today, to: addDays(today, 1) }), adminMenu(), getPublicMenu()]);
  const ranking = publicMenu
    .flatMap((c) => c.dishes)
    .filter((d) => d.orderedCount > 0)
    .sort((a, b) => b.orderedCount - a.orderedCount)
    .slice(0, 8);
  const upcoming = next.filter((o) => ["NEW", "CONFIRMED", "PREPARING", "READY"].includes(o.status)).slice(0, 12);
  const live = menu.flatMap((c) => c.items).filter((i) => !i.isArchived);
  const showMoney = can(user.role, "reports:view");

  return (
    <>
      <AdminHeader title={`Hello, ${user.name.split(" ")[0]}`} intro={new Intl.DateTimeFormat("en-AU", { dateStyle: "full", timeZone: s.timezone }).format(new Date())} />
      <div className="mb-4 space-y-3">
        {sp.denied ? <Alert tone="error">You don&apos;t have access to that page.</Alert> : null}
        {!s.acceptingOrders ? <Alert tone="warning">Online ordering is paused. Turn it back on in Pickup &amp; capacity.</Alert> : null}
        {(process.env.PAYMENT_PROVIDER ?? "demo") !== "stripe" ? <Alert tone="info">Payments are in test mode (no real money). Connect Stripe test keys, then get owner approval before going live.</Alert> : null}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New orders to accept" value={stats.newCount} />
        <Stat label="Pickups today" value={stats.todayPickups} hint={`${stats.readyCount} ready now`} />
        <Stat label="Upcoming (after today)" value={stats.upcoming} />
        {showMoney ? <Stat label="Sales today" value={formatCents(stats.sales.today)} hint={`${formatCents(stats.sales.week)} over 7 days · ${stats.sales.weekOrders} orders`} /> : <Stat label="Sold-out dishes" value={live.filter((i) => !i.isAvailable).length} />}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Next pickups"
          actions={
            <Link href="/admin/orders" className="text-sm text-gold underline">
              Order board
            </Link>
          }
        >
          {upcoming.length ? (
            <ul className="divide-y divide-line/60">
              {upcoming.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-gold">
                    <span>
                      <strong>{o.pickupDate === today ? "Today" : formatDateShort(o.pickupDate)} {formatTime12(o.pickupTime)}</strong> · {o.customerName}
                      <span className="block text-sm text-muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
                    </span>
                    <Badge tone={o.status === "NEW" ? "maroon" : o.status === "READY" ? "success" : "gold"}>{STATUS_LABEL[o.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No pickups today or tomorrow.</Empty>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Needs attention">
            {attention.length ? (
              <ul className="space-y-2 text-sm">
                {attention.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-warning underline">
                      {o.reference}
                    </Link>{" "}
                    {o.attentionReason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing needs attention.</p>
            )}
          </Panel>
          <Panel title="Menu health">
            <ul className="space-y-1 text-sm">
              <li>{live.length} dishes on the menu</li>
              <li>{live.filter((i) => !i.isAvailable).length} sold out</li>
              <li className={live.some((i) => !i.allergensConfirmed) ? "text-warning" : ""}>{live.filter((i) => !i.allergensConfirmed).length} with allergens still to confirm</li>
              <li>{live.filter((i) => !i.imagePath).length} without a photo</li>
            </ul>
            <Link href="/admin/menu" className="mt-3 inline-block text-sm text-gold underline">
              Manage menu
            </Link>
          </Panel>
          <Panel title="Most loved dishes">
            <p className="mb-3 text-sm text-muted">
              Ranked automatically from orders in the last {POPULAR_WINDOW_DAYS} days. The top dishes (with at least {MOST_LOVED_MIN_UNITS} ordered) get a &ldquo;Most loved&rdquo; badge on the website and lead the homepage carousel.
            </p>
            {ranking.length ? (
              <ol className="space-y-1.5 text-sm">
                {ranking.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                      {d.name} {d.isMostLoved ? <Badge tone="gold">Most loved</Badge> : null}
                    </span>
                    <span className="tabular-nums text-muted">{d.orderedCount} ordered</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No orders yet. This fills in by itself as orders come in.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
