import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { loadScheduleContext, loadUsage } from "@/lib/server/schedule";
import { upcomingClosedDates } from "@/lib/server/schedule-admin";
import { buildAvailability } from "@/lib/domain/schedule";
import { addDays, formatDateShort, toZoned } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ClosedDates, HoursForm, RulesForm } from "@/components/admin/ScheduleForms";

export const metadata: Metadata = { title: "Pickup & capacity" };

export default async function SchedulePage() {
  await requireStaffPage("schedule:edit");
  const now = new Date();
  const ctx = await loadScheduleContext();
  const today = toZoned(now, ctx.rules.timezone).date;
  const [closed, usage] = await Promise.all([upcomingClosedDates(ctx.rules.timezone), loadUsage(getDb(), today, addDays(today, 6), now)]);
  // Capacity preview ignores notice/cut-off so the owner sees the whole week
  const preview = buildAvailability(now, { ...ctx.rules, acceptingOrders: true, minNoticeHours: -1000, orderCutoffTime: null, maxAdvanceDays: 6 }, ctx.hours, ctx.closed, { prepLeadHours: -1000, dayRestricted: [], dailyLimited: [] }, usage);
  const s = ctx.settings;

  return (
    <>
      <AdminHeader title="Pickup & capacity" intro="Control when customers can pick up, how far ahead they can order, and how many orders you can take." />
      <div className="grid gap-6 2xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel title="Ordering rules">
            <RulesForm
              initial={{
                acceptingOrders: s.acceptingOrders,
                minNoticeHours: s.minNoticeHours,
                maxAdvanceDays: s.maxAdvanceDays,
                orderCutoffTime: s.orderCutoffTime,
                slotMinutes: s.slotMinutes,
                slotCapacity: s.slotCapacity,
                dailyOrderLimit: s.dailyOrderLimit,
                paymentHoldMinutes: s.paymentHoldMinutes,
                cancelDeadlineHours: s.cancelDeadlineHours,
              }}
            />
          </Panel>
          <Panel title="Pickup hours">
            <HoursForm initial={ctx.hours} />
          </Panel>
          <Panel title="Closed dates & holidays">
            <ClosedDates dates={closed} today={today} />
          </Panel>
        </div>
        <Panel title="Bookings this week" className="h-fit">
          <ul className="space-y-5">
            {preview.map((d) => {
              const booked = usage.ordersByDate.get(d.date) ?? 0;
              return (
                <li key={d.date}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{formatDateShort(d.date)}</span>
                    <span className="text-sm text-muted">{d.status === "closed" ? (d.reason ?? "Closed") : `${booked} / ${s.dailyOrderLimit} orders`}</span>
                  </div>
                  {d.slots.length ? (
                    <div className="mt-2 flex flex-wrap gap-1" aria-label={`Slot usage on ${formatDateShort(d.date)}`}>
                      {d.slots.map((sl) => {
                        const used = s.slotCapacity - sl.remaining;
                        const pct = Math.min(100, (used / s.slotCapacity) * 100);
                        return (
                          <span key={sl.time} title={`${formatTime12(sl.time)}: ${used}/${s.slotCapacity}`} className="relative h-6 w-9 overflow-hidden rounded bg-sunken text-[0.6rem] leading-6 text-center">
                            <span aria-hidden className={`absolute inset-x-0 bottom-0 ${pct >= 100 ? "bg-danger/60" : "bg-gold/50"}`} style={{ height: `${pct}%` }} />
                            <span className="relative">{used || ""}</span>
                            <span className="sr-only">
                              {formatTime12(sl.time)}: {used} of {s.slotCapacity} booked
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
