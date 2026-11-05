import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { BOARD_COLUMNS, boardOrders } from "@/lib/server/admin-orders";
import { getSettings } from "@/lib/server/settings";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { addDays, formatDateShort, isDateString, toZoned } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { formatCents } from "@/lib/domain/money";
import { AdminHeader, Badge } from "@/components/admin/ui";
import { NextStepButton } from "@/components/admin/widgets";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersBoard({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage("orders:view");
  const sp = await searchParams;
  const s = await getSettings();
  const today = toZoned(new Date(), s.timezone).date;
  const range = typeof sp.range === "string" ? sp.range : "upcoming";
  const day = typeof sp.date === "string" && isDateString(sp.date) ? sp.date : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const from = day ?? (range === "past" ? addDays(today, -30) : today);
  const to = day ?? (range === "today" ? today : range === "past" ? addDays(today, -1) : addDays(today, 60));
  const orders = await boardOrders({ from, to, q: q || undefined });
  const view = typeof sp.view === "string" && BOARD_COLUMNS.includes(sp.view as never) ? sp.view : null;
  const cols = view ? BOARD_COLUMNS.filter((c) => c === view) : BOARD_COLUMNS;

  const tab = (key: string, label: string) => (
    <Link href={`/admin/orders?range=${key}`} aria-current={!day && range === key ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm ${!day && range === key ? "bg-gold text-gold-ink" : "text-muted hover:text-text"}`}>
      {label}
    </Link>
  );

  return (
    <>
      <AdminHeader
        title="Orders"
        intro={day ? `Pickups on ${formatDateShort(day)}` : range === "today" ? "Today's pickups" : range === "past" ? "Last 30 days" : "Today and upcoming pickups"}
        actions={
          <Link href={`/admin/production?date=${day ?? today}`} className={buttonClass("outline", "sm")}>
            Kitchen schedule
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <nav aria-label="Date range" className="flex gap-1 rounded-full border border-line p-1">
          {tab("today", "Today")}
          {tab("upcoming", "Upcoming")}
          {tab("past", "Past 30 days")}
        </nav>
        <form className="flex w-full flex-wrap gap-2 sm:w-auto" action="/admin/orders">
          <input type="date" name="date" defaultValue={day ?? ""} aria-label="Pickup date" className="h-9 rounded-lg border border-line bg-sunken px-2 text-sm" />
          <input name="q" defaultValue={q} placeholder="Search name, phone, DSK-…" aria-label="Search orders" className="h-9 min-w-0 flex-1 rounded-lg sm:w-56 sm:flex-none border border-line bg-sunken px-3 text-sm" />
          <button className={buttonClass("ghost", "sm")}>Filter</button>
        </form>
      </div>

      <div className="rail -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {cols.map((col) => {
          const list = orders.filter((o) => o.status === col);
          return (
            <section key={col} aria-labelledby={`col-${col}`} className="w-72 shrink-0 rounded-2xl border border-line bg-sunken">
              <h2 id={`col-${col}`} className="flex items-center justify-between border-b border-line px-4 py-3 font-semibold">
                <Link href={`/admin/orders?range=${range}&view=${col}`} className="hover:text-gold">
                  {STATUS_LABEL[col]}
                </Link>
                <span className="rounded-full bg-raised px-2 text-sm tabular-nums">{list.length}</span>
              </h2>
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                {list.length === 0 ? <li className="px-2 py-6 text-center text-sm text-muted">None</li> : null}
                {list.map((o) => (
                  <li key={o.id} className={`rounded-xl border bg-raised p-3 ${o.attentionReason ? "border-warning" : "border-line"}`}>
                    <Link href={`/admin/orders/${o.id}`} className="block hover:text-gold">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{o.customerName}</span>
                        <span className="text-sm tabular-nums">{formatCents(o.totalCents)}</span>
                      </div>
                      <p className="text-sm text-muted">
                        {o.pickupDate === today ? "Today" : formatDateShort(o.pickupDate)} · {formatTime12(o.pickupTime)} · {o.reference}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                      {o.notes ? <p className="mt-1 line-clamp-2 text-xs text-warning">Note: {o.notes}</p> : null}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {o.attentionReason ? <Badge tone="warning">Needs attention</Badge> : null}
                      {o.refundedCents ? <Badge tone="danger">Refunded {formatCents(o.refundedCents)}</Badge> : null}
                    </div>
                    <div className="mt-2">
                      <NextStepButton orderId={o.id} status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {view ? (
        <Link href={`/admin/orders?range=${range}`} className="text-sm text-gold underline">
          Show all columns
        </Link>
      ) : null}
    </>
  );
}
