import { addDays, dayOfWeek, fromZoned, minutesToTime, timeToMinutes, toZoned } from "./time";
import { DAY_NAMES } from "./hours";

export type ScheduleRules = {
  timezone: string;
  acceptingOrders: boolean;
  minNoticeHours: number;
  maxAdvanceDays: number;
  slotMinutes: number;
  slotCapacity: number;
  dailyOrderLimit: number;
  /** HH:MM; orders for a date close at this time on the previous day. null = no cutoff */
  orderCutoffTime: string | null;
};

export type DayHours = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };

/** What the cart needs from the schedule */
export type CartNeeds = {
  /** Largest per-dish notice requirement in hours */
  prepLeadHours: number;
  /** Dishes restricted to certain weekdays */
  dayRestricted: { name: string; days: number[] }[];
  /** Dishes with a per-day production cap, and how many this order wants */
  dailyLimited: { id: string; name: string; limit: number; quantity: number }[];
};

/** Live usage: only paid orders and unexpired payment holds count */
export type Usage = {
  ordersByDate: Map<string, number>;
  ordersBySlot: Map<string, number>; // key `${date} ${time}`
  qtyByDateItem: Map<string, number>; // key `${date}|${itemId}`
};

export type Slot = { time: string; startsAt: string; remaining: number; available: boolean; reason?: string };
export type Day = { date: string; dow: number; status: "open" | "closed" | "full" | "unavailable"; reason?: string; slots: Slot[] };

export const emptyUsage = (): Usage => ({ ordersByDate: new Map(), ordersBySlot: new Map(), qtyByDateItem: new Map() });

function dayReason(date: string, rules: ScheduleRules, hours: DayHours[], closed: Map<string, string | null>, needs: CartNeeds, usage: Usage, now: Date): { status: Day["status"]; reason?: string } {
  const dow = dayOfWeek(date);
  if (closed.has(date)) return { status: "closed", reason: closed.get(date) || "Closed" };
  const h = hours.find((x) => x.dayOfWeek === dow);
  if (!h || !h.isOpen) return { status: "closed", reason: "Closed" };
  for (const r of needs.dayRestricted) {
    if (r.days.length && !r.days.includes(dow)) return { status: "unavailable", reason: `${r.name} isn't available on ${DAY_NAMES[dow]}s` };
  }
  if (rules.orderCutoffTime) {
    const cutoff = fromZoned(addDays(date, -1), rules.orderCutoffTime, rules.timezone);
    if (now.getTime() >= cutoff.getTime()) return { status: "unavailable", reason: "Orders for this day have closed" };
  }
  if ((usage.ordersByDate.get(date) ?? 0) >= rules.dailyOrderLimit) return { status: "full", reason: "Fully booked" };
  for (const d of needs.dailyLimited) {
    const used = usage.qtyByDateItem.get(`${date}|${d.id}`) ?? 0;
    if (used + d.quantity > d.limit) {
      const left = Math.max(0, d.limit - used);
      return { status: "full", reason: left ? `Only ${left} × ${d.name} left for this day` : `${d.name} is sold out for this day` };
    }
  }
  return { status: "open" };
}

/**
 * Builds the pickup calendar for a cart. Pure: given the same inputs it always returns
 * the same answer, which makes it testable at every boundary.
 */
export function buildAvailability(now: Date, rules: ScheduleRules, hours: DayHours[], closed: Map<string, string | null>, needs: CartNeeds, usage: Usage): Day[] {
  if (!rules.acceptingOrders) return [];
  const tz = rules.timezone;
  const today = toZoned(now, tz).date;
  const noticeMs = Math.max(rules.minNoticeHours, needs.prepLeadHours) * 3600_000;
  const earliest = now.getTime() + noticeMs;
  const days: Day[] = [];

  for (let i = 0; i <= rules.maxAdvanceDays; i++) {
    const date = addDays(today, i);
    const dow = dayOfWeek(date);
    const base = dayReason(date, rules, hours, closed, needs, usage, now);
    const h = hours.find((x) => x.dayOfWeek === dow);
    const slots: Slot[] = [];
    if (h && h.isOpen && base.status !== "closed") {
      const open = timeToMinutes(h.openTime);
      const close = timeToMinutes(h.closeTime);
      for (let t = open; t + rules.slotMinutes <= close; t += rules.slotMinutes) {
        const time = minutesToTime(t);
        const startsAt = fromZoned(date, time, tz);
        const used = usage.ordersBySlot.get(`${date} ${time}`) ?? 0;
        const remaining = Math.max(0, rules.slotCapacity - used);
        let reason: string | undefined;
        if (startsAt.getTime() < earliest) reason = "Too soon";
        else if (remaining <= 0) reason = "Full";
        else if (base.status !== "open") reason = base.reason;
        slots.push({ time, startsAt: startsAt.toISOString(), remaining, available: !reason, reason });
      }
    }
    let status = base.status;
    let reason = base.reason;
    if (status === "open") {
      if (!slots.some((s) => s.available)) {
        const tooSoon = slots.length > 0 && slots.every((s) => s.reason === "Too soon" || !s.available) && slots.some((s) => s.reason === "Too soon");
        status = tooSoon ? "unavailable" : "full";
        reason = tooSoon ? "Not enough notice" : "Fully booked";
      }
    }
    days.push({ date, dow, status, reason, slots });
  }
  return days;
}

/** Server-side check for a specific chosen slot. Used inside the reservation transaction. */
export function checkPickup(date: string, time: string, now: Date, rules: ScheduleRules, hours: DayHours[], closed: Map<string, string | null>, needs: CartNeeds, usage: Usage): { ok: true; startsAt: Date } | { ok: false; reason: string } {
  if (!rules.acceptingOrders) return { ok: false, reason: "We're not taking online orders right now." };
  const days = buildAvailability(now, rules, hours, closed, needs, usage);
  const day = days.find((d) => d.date === date);
  if (!day) return { ok: false, reason: "That date can't be booked online." };
  const slot = day.slots.find((s) => s.time === time);
  if (!slot) return { ok: false, reason: day.reason ?? "That pickup time isn't offered." };
  if (!slot.available) {
    const r = slot.reason === "Full" ? "That pickup time has just filled up. Please choose another." : slot.reason === "Too soon" ? "That pickup time is too soon. Please choose a later time." : slot.reason ?? "That pickup time isn't available.";
    return { ok: false, reason: r };
  }
  return { ok: true, startsAt: new Date(slot.startsAt) };
}
