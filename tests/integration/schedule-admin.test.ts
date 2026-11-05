import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDb, closeDb, owner } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { addClosedDate, removeClosedDate, saveHours, saveRules } from "@/lib/server/schedule-admin";
import { loadScheduleContext } from "@/lib/server/schedule";

let db: DB;
beforeAll(async () => {
  db = await resetDb();
});
afterAll(closeDb);

const rules = { acceptingOrders: true, minNoticeHours: 36, maxAdvanceDays: 21, orderCutoffTime: "18:00", slotMinutes: 15, slotCapacity: 2, dailyOrderLimit: 12, paymentHoldMinutes: 15, cancelDeadlineHours: 48 };

describe("owner schedule configuration", () => {
  it("saves valid rules and audits the change", async () => {
    expect((await saveRules(owner, rules, db)).ok).toBe(true);
    const ctx = await loadScheduleContext(db);
    expect(ctx.rules).toMatchObject({ minNoticeHours: 36, slotMinutes: 15, slotCapacity: 2, orderCutoffTime: "18:00" });
    const logs = await db.select().from(schema.auditLogs);
    expect(logs.some((l) => l.action === "schedule.rules")).toBe(true);
  });
  it("rejects invalid rules", async () => {
    for (const bad of [{ slotMinutes: 25 }, { slotCapacity: 0 }, { orderCutoffTime: "25:00" }, { paymentHoldMinutes: 2 }, { maxAdvanceDays: 0 }]) {
      expect((await saveRules(owner, { ...rules, ...bad }, db)).ok).toBe(false);
    }
  });
  it("validates opening hours", async () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: d !== 1, openTime: "11:00", closeTime: "21:00" }));
    expect((await saveHours(owner, week, db)).ok).toBe(true);
    const ctx = await loadScheduleContext(db);
    expect(ctx.hours.find((h) => h.dayOfWeek === 1)!.isOpen).toBe(false);
    const bad = week.map((w) => (w.dayOfWeek === 2 ? { ...w, closeTime: "10:00" } : w));
    const r = await saveHours(owner, bad, db);
    expect(r.ok).toBe(false);
  });
  it("adds and removes closed dates", async () => {
    expect((await addClosedDate(owner, { date: "2026-12-25", reason: "Christmas" }, db)).ok).toBe(true);
    expect((await loadScheduleContext(db)).closed.get("2026-12-25")).toBe("Christmas");
    expect((await addClosedDate(owner, { date: "2026-02-30", reason: null }, db)).ok).toBe(false);
    await removeClosedDate(owner, "2026-12-25", db);
    expect((await loadScheduleContext(db)).closed.has("2026-12-25")).toBe(false);
  });
});
