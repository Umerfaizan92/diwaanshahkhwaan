import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { productionPlan } from "@/lib/server/admin-orders";
import { getSettings } from "@/lib/server/settings";
import { addDays, formatDateLong, isDateString, toZoned } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { AdminHeader, Empty, Panel } from "@/components/admin/ui";
import { PrintButton } from "@/components/shop/PrintButton";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Kitchen schedule" };

export default async function ProductionPage({ searchParams }: PageProps<"/admin/production">) {
  await requireStaffPage("production:view");
  const sp = await searchParams;
  const s = await getSettings();
  const today = toZoned(new Date(), s.timezone).date;
  const date = typeof sp.date === "string" && isDateString(sp.date) ? sp.date : today;
  const plan = await productionPlan(date);

  return (
    <>
      <AdminHeader
        title="Kitchen schedule"
        intro={`${formatDateLong(date)} — ${plan.orders.length} order${plan.orders.length === 1 ? "" : "s"}`}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Link href={`/admin/production?date=${addDays(date, -1)}`} className={buttonClass("ghost", "sm")}>
              ‹ Previous day
            </Link>
            <form action="/admin/production">
              <input type="date" name="date" defaultValue={date} aria-label="Date" className="h-9 rounded-lg border border-line bg-sunken px-2 text-sm" />
              <button className={buttonClass("ghost", "sm")}>Go</button>
            </form>
            <Link href={`/admin/production?date=${addDays(date, 1)}`} className={buttonClass("ghost", "sm")}>
              Next day ›
            </Link>
            <PrintButton />
          </div>
        }
      />
      {plan.orders.length === 0 ? (
        <Empty>No paid orders for this day yet.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Panel title="What to cook">
            <table className="w-full text-[0.95rem]">
              <thead>
                <tr className="border-b border-line text-left text-sm text-muted">
                  <th scope="col" className="py-2">Dish</th>
                  <th scope="col" className="py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {plan.dishes.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2.5">
                      <span className="font-semibold">{d.name}</span>
                      {d.variants.length > 1 || d.variants[0][0] !== "Standard" ? (
                        <ul className="text-sm text-muted">
                          {d.variants.map(([v, n]) => (
                            <li key={v}>
                              {n} × {v}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right align-top font-display text-xl tabular-nums">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Pickups by time">
            <ol className="space-y-4">
              {plan.slots.map(([time, orders]) => (
                <li key={time}>
                  <h3 className="font-semibold text-gold">{formatTime12(time)}</h3>
                  <ul className="mt-1 space-y-2">
                    {orders.map((o) => (
                      <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-gold">
                            {o.customerName} · {o.reference}
                          </Link>
                          <span className="text-muted">
                            {STATUS_LABEL[o.status]} · {o.customerPhone}
                          </span>
                        </div>
                        <p className="mt-1">{o.items.map((i) => `${i.quantity}× ${i.name}${i.options.length ? ` (${i.options.map((x) => x.choice).join(", ")})` : ""}`).join("; ")}</p>
                        {o.notes ? <p className="mt-1 text-warning">Note: {o.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </>
  );
}
