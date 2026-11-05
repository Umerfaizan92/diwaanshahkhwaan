import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { salesReport } from "@/lib/server/reports";
import { getSettings } from "@/lib/server/settings";
import { addDays, formatDateShort, isDateString, toZoned } from "@/lib/domain/time";
import { formatCents } from "@/lib/domain/money";
import { AdminHeader, Panel, Stat } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Sales reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireStaffPage("reports:view");
  const sp = await searchParams;
  const s = await getSettings();
  const today = toZoned(new Date(), s.timezone).date;
  const to = typeof sp.to === "string" && isDateString(sp.to) ? sp.to : today;
  const from = typeof sp.from === "string" && isDateString(sp.from) && sp.from <= to ? sp.from : addDays(to, -29);
  const r = await salesReport(from, to, s.timezone);
  const max = Math.max(1, ...r.byDay.map((d) => d.gross));
  return (
    <>
      <AdminHeader
        title="Sales reports"
        intro={`Paid orders from ${formatDateShort(from)} to ${formatDateShort(to)}, by payment date (Perth time).`}
        actions={
          <Link href={`/admin/export/orders?from=${from}&to=${to}`} className={buttonClass("outline", "sm")} prefetch={false}>
            Download CSV
          </Link>
        }
      />
      <form action="/admin/reports" className="mb-6 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          From
          <input type="date" name="from" defaultValue={from} className="ml-2 h-9 rounded-lg border border-line bg-sunken px-2" />
        </label>
        <label className="text-sm">
          To
          <input type="date" name="to" defaultValue={to} className="ml-2 h-9 rounded-lg border border-line bg-sunken px-2" />
        </label>
        <button className={buttonClass("ghost", "sm")}>Update</button>
        {[
          [7, "7 days"],
          [30, "30 days"],
          [90, "90 days"],
        ].map(([n, l]) => (
          <Link key={l} href={`/admin/reports?from=${addDays(today, -(Number(n) - 1))}&to=${today}`} className="rounded-full border border-line px-3 py-1 text-sm text-muted">
            Last {l}
          </Link>
        ))}
      </form>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Orders" value={r.totals.orders} />
        <Stat label="Gross sales" value={formatCents(r.totals.gross)} />
        <Stat label="Refunds" value={formatCents(r.totals.refunds)} />
        <Stat label="Net sales" value={formatCents(r.totals.net)} />
        <Stat label="Average order" value={formatCents(r.totals.average)} hint={r.totals.gst ? `GST collected ${formatCents(r.totals.gst)}` : "No GST charged"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="By day">
          {r.byDay.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="py-2">Day</th>
                  <th scope="col" className="py-2 text-right">Orders</th>
                  <th scope="col" className="w-2/5 py-2">
                    <span className="sr-only">Chart</span>
                  </th>
                  <th scope="col" className="py-2 text-right">Gross</th>
                  <th scope="col" className="py-2 text-right">Refunds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {r.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className="py-2">{formatDateShort(d.day)}</td>
                    <td className="py-2 text-right tabular-nums">{d.orders}</td>
                    <td className="px-3 py-2">
                      <span aria-hidden className="block h-2.5 rounded-full bg-gold/70" style={{ width: `${(d.gross / max) * 100}%` }} />
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatCents(d.gross)}</td>
                    <td className="py-2 text-right tabular-nums">{d.refunds ? formatCents(d.refunds) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No sales in this period.</p>
          )}
        </Panel>
        <Panel title="Top dishes">
          {r.dishes.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="py-2">Dish</th>
                  <th scope="col" className="py-2 text-right">Sold</th>
                  <th scope="col" className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {r.dishes.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2">{d.name}</td>
                    <td className="py-2 text-right tabular-nums">{d.qty}</td>
                    <td className="py-2 text-right tabular-nums">{formatCents(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No sales in this period.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
