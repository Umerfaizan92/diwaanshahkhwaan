import { describe, expect, it } from "vitest";
import { buildAvailability, checkPickup, emptyUsage, type CartNeeds, type DayHours, type ScheduleRules } from "@/lib/domain/schedule";
import { addDays, dayOfWeek, fromZoned, toZoned } from "@/lib/domain/time";

const TZ = "Australia/Perth";
const rules: ScheduleRules = { timezone: TZ, acceptingOrders: true, minNoticeHours: 24, maxAdvanceDays: 14, slotMinutes: 30, slotCapacity: 4, dailyOrderLimit: 30, orderCutoffTime: "20:00" };
const hours: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: true, openTime: "12:00", closeTime: "20:00" }));
const none: CartNeeds = { prepLeadHours: 0, dayRestricted: [], dailyLimited: [] };
const perth = (date: string, time: string) => fromZoned(date, time, TZ);
// Thursday 5 November 2026
const THU = "2026-11-05";
const FRI = "2026-11-06";

describe("timezone helpers", () => {
  it("converts Perth wall-clock to UTC (UTC+8, no DST)", () => {
    expect(perth(FRI, "12:00").toISOString()).toBe("2026-11-06T04:00:00.000Z");
    expect(toZoned(new Date("2026-11-05T16:30:00Z"), TZ)).toMatchObject({ date: FRI, time: "00:30", dow: 5 });
  });
  it("handles a DST zone correctly too", () => {
    expect(fromZoned("2026-11-06", "12:00", "Australia/Sydney").toISOString()).toBe("2026-11-06T01:00:00.000Z"); // AEDT +11
    expect(fromZoned("2026-06-06", "12:00", "Australia/Sydney").toISOString()).toBe("2026-06-06T02:00:00.000Z"); // AEST +10
  });
  it("does date arithmetic across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(dayOfWeek(THU)).toBe(4);
  });
});

describe("buildAvailability", () => {
  it("offers 30-minute slots inside opening hours, ending before close", () => {
    const days = buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), none, emptyUsage());
    expect(days).toHaveLength(15); // today + 14
    const fri = days.find((d) => d.date === FRI)!;
    expect(fri.status).toBe("open");
    expect(fri.slots.map((s) => s.time)).toEqual(Array.from({ length: 16 }, (_, i) => `${String(12 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`));
    expect(fri.slots.at(-1)!.time).toBe("19:30");
  });

  it("enforces minimum notice exactly at the boundary", () => {
    const exact = buildAvailability(perth(THU, "12:00"), rules, hours, new Map(), none, emptyUsage()).find((d) => d.date === FRI)!;
    expect(exact.slots[0]).toMatchObject({ time: "12:00", available: true });
    const later = buildAvailability(new Date(perth(THU, "12:00").getTime() + 1000), rules, hours, new Map(), none, emptyUsage()).find((d) => d.date === FRI)!;
    expect(later.slots[0]).toMatchObject({ time: "12:00", available: false, reason: "Too soon" });
    expect(later.slots[1]).toMatchObject({ time: "12:30", available: true });
  });

  it("uses the longest dish lead time when it exceeds the business minimum", () => {
    const days = buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), { ...none, prepLeadHours: 48 }, emptyUsage());
    expect(days.find((d) => d.date === FRI)!.status).toBe("unavailable");
    expect(days.find((d) => d.date === "2026-11-07")!.slots[0].available).toBe(true);
  });

  it("closes a day at the cut-off time the evening before", () => {
    const r = { ...rules, minNoticeHours: 0 };
    const before = buildAvailability(perth(THU, "19:59"), r, hours, new Map(), none, emptyUsage()).find((d) => d.date === FRI)!;
    expect(before.status).toBe("open");
    const at = buildAvailability(perth(THU, "20:00"), r, hours, new Map(), none, emptyUsage()).find((d) => d.date === FRI)!;
    expect(at).toMatchObject({ status: "unavailable", reason: "Orders for this day have closed" });
    expect(at.slots.every((s) => !s.available)).toBe(true);
  });

  it("respects closed weekdays, holidays and the advance booking window", () => {
    const h = hours.map((x) => (x.dayOfWeek === 1 ? { ...x, isOpen: false } : x));
    const days = buildAvailability(perth(THU, "10:00"), { ...rules, maxAdvanceDays: 7 }, h, new Map([["2026-11-07", "Family wedding"]]), none, emptyUsage());
    expect(days).toHaveLength(8);
    expect(days.at(-1)!.date).toBe("2026-11-12");
    expect(days.find((d) => d.date === "2026-11-07")).toMatchObject({ status: "closed", reason: "Family wedding", slots: [] });
    expect(days.find((d) => d.date === "2026-11-09")).toMatchObject({ status: "closed", slots: [] });
  });

  it("marks slots full at capacity and days full at the daily order limit", () => {
    const usage = emptyUsage();
    usage.ordersBySlot.set(`${FRI} 12:00`, 4);
    usage.ordersBySlot.set(`${FRI} 12:30`, 3);
    let fri = buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), none, usage).find((d) => d.date === FRI)!;
    expect(fri.slots[0]).toMatchObject({ available: false, reason: "Full", remaining: 0 });
    expect(fri.slots[1]).toMatchObject({ available: true, remaining: 1 });
    usage.ordersByDate.set(FRI, 30);
    fri = buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), none, usage).find((d) => d.date === FRI)!;
    expect(fri).toMatchObject({ status: "full", reason: "Fully booked" });
  });

  it("stops overselling a dish with a daily production limit", () => {
    const usage = emptyUsage();
    usage.qtyByDateItem.set(`${FRI}|daleem`, 8);
    const needs = (q: number): CartNeeds => ({ ...none, dailyLimited: [{ id: "daleem", name: "Shahi Daleem", limit: 10, quantity: q }] });
    expect(buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), needs(2), usage).find((d) => d.date === FRI)!.status).toBe("open");
    expect(buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), needs(3), usage).find((d) => d.date === FRI)).toMatchObject({ status: "full", reason: "Only 2 × Shahi Daleem left for this day" });
  });

  it("limits weekday-only dishes to their days", () => {
    const days = buildAvailability(perth(THU, "10:00"), rules, hours, new Map(), { ...none, dayRestricted: [{ name: "Daleem", days: [5, 6] }] }, emptyUsage());
    expect(days.find((d) => d.date === FRI)!.status).toBe("open");
    expect(days.find((d) => d.date === "2026-11-08")).toMatchObject({ status: "unavailable", reason: "Daleem isn't available on Sundays" });
  });

  it("returns nothing when online ordering is switched off", () => {
    expect(buildAvailability(perth(THU, "10:00"), { ...rules, acceptingOrders: false }, hours, new Map(), none, emptyUsage())).toEqual([]);
  });
});

describe("checkPickup", () => {
  const now = perth(THU, "10:00");
  it("accepts a valid slot and returns its UTC instant", () => {
    const r = checkPickup(FRI, "18:30", now, rules, hours, new Map(), none, emptyUsage());
    expect(r).toEqual({ ok: true, startsAt: perth(FRI, "18:30") });
  });
  it("rejects off-grid, after-close, past and too-far times", () => {
    expect(checkPickup(FRI, "12:15", now, rules, hours, new Map(), none, emptyUsage()).ok).toBe(false);
    expect(checkPickup(FRI, "20:00", now, rules, hours, new Map(), none, emptyUsage()).ok).toBe(false);
    expect(checkPickup(THU, "18:00", now, rules, hours, new Map(), none, emptyUsage()).ok).toBe(false);
    expect(checkPickup("2026-11-20", "12:00", now, rules, hours, new Map(), none, emptyUsage()).ok).toBe(false);
    expect(checkPickup("2026-11-01", "12:00", now, rules, hours, new Map(), none, emptyUsage()).ok).toBe(false);
  });
  it("explains a slot that just filled", () => {
    const usage = emptyUsage();
    usage.ordersBySlot.set(`${FRI} 18:30`, 4);
    const r = checkPickup(FRI, "18:30", now, rules, hours, new Map(), none, usage);
    expect(r).toEqual({ ok: false, reason: "That pickup time has just filled up. Please choose another." });
  });
});
