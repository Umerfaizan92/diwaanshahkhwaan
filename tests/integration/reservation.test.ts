import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { resetDb, closeDb } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { createReservation, expireStaleHolds } from "@/lib/server/orders";
import { availabilityForCart } from "@/lib/server/schedule";
import { fromZoned } from "@/lib/domain/time";

let db: DB;
let biryaniId = "";
let mediumId = "";
let kheerId = "";
const NOW = fromZoned("2026-11-05", "10:00", "Australia/Perth"); // Thu 10am Perth
const FRI = "2026-11-06";

beforeAll(async () => {
  db = await resetDb();
  const b = await db.query.menuItems.findFirst({ where: eq(schema.menuItems.slug, "shahi-chicken-biryani"), with: { optionGroups: { with: { choices: true } } } });
  biryaniId = b!.id;
  mediumId = b!.optionGroups[0].choices.find((c) => c.name === "Medium")!.id;
  kheerId = (await db.query.menuItems.findFirst({ where: eq(schema.menuItems.slug, "shahi-kheer") }))!.id;
});
afterAll(closeDb);
beforeEach(async () => {
  await db.execute(sql`truncate orders, order_items, order_events restart identity cascade`);
  await db.update(schema.businessSettings).set({ slotCapacity: 4, dailyOrderLimit: 30, acceptingOrders: true, paymentHoldMinutes: 20 });
  await db.update(schema.menuItems).set({ dailyLimit: null }).where(eq(schema.menuItems.id, kheerId));
});

const checkout = (over: Record<string, unknown> = {}) => ({
  idempotencyKey: randomUUID().replace(/-/g, ""),
  lines: [{ menuItemId: biryaniId, quantity: 2, choiceIds: [mediumId] }],
  name: "Aisha Khan",
  email: "aisha@example.com",
  phone: "0412 345 678",
  notes: "",
  pickupDate: FRI,
  pickupTime: "18:00",
  smsOptIn: false,
  acceptTerms: true as const,
  ...over,
});

describe("createReservation", () => {
  it("creates a priced PENDING_PAYMENT order holding the slot", async () => {
    const r = await createReservation(checkout(), { now: NOW, db });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.status).toBe("PENDING_PAYMENT");
    expect(r.order.totalCents).toBe(2400);
    expect(r.order.reference).toMatch(/^DSK-[A-Z2-9]{6}$/);
    expect(r.order.pickupAt.toISOString()).toBe("2026-11-06T10:00:00.000Z");
    expect(r.order.holdExpiresAt!.getTime() - NOW.getTime()).toBe(20 * 60_000);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, r.order.id));
    expect(items[0]).toMatchObject({ name: "Shahi Chicken Biryani", quantity: 2, unitPriceCents: 1200, lineTotalCents: 2400 });
  });

  it("is idempotent: the same checkout submitted twice creates one order", async () => {
    const input = checkout();
    const [a, b] = await Promise.all([createReservation(input, { now: NOW, db }), createReservation(input, { now: NOW, db })]);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.order.id).toBe(b.order.id);
    expect((await db.select().from(schema.orders)).length).toBe(1);
  });

  it("never overbooks a slot under concurrent checkouts", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => createReservation(checkout(), { now: NOW, db })));
    const ok = results.filter((r) => r.ok);
    const full = results.filter((r) => !r.ok);
    expect(ok).toHaveLength(4);
    expect(full).toHaveLength(8);
    expect(full.every((r) => !r.ok && r.code === "SLOT")).toBe(true);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(eq(schema.orders.pickupTime, "18:00"));
    expect(n).toBe(4);
  });

  it("never oversells a dish with a daily limit under concurrent checkouts", async () => {
    await db.update(schema.menuItems).set({ dailyLimit: 5 }).where(eq(schema.menuItems.id, kheerId));
    const times = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];
    const results = await Promise.all(times.map((t) => createReservation(checkout({ pickupTime: t, lines: [{ menuItemId: kheerId, quantity: 2, choiceIds: [] }] }), { now: NOW, db })));
    const sold = results.filter((r) => r.ok).length * 2;
    expect(sold).toBeLessThanOrEqual(5);
    expect(sold).toBe(4);
  });

  it("enforces the daily order limit", async () => {
    await db.update(schema.businessSettings).set({ dailyOrderLimit: 2 });
    const r = await Promise.all(["12:00", "13:00", "14:00"].map((t) => createReservation(checkout({ pickupTime: t }), { now: NOW, db })));
    expect(r.filter((x) => x.ok)).toHaveLength(2);
  });

  it("releases capacity when a hold expires, and expiry is idempotent", async () => {
    await db.update(schema.businessSettings).set({ slotCapacity: 1 });
    const first = await createReservation(checkout(), { now: NOW, db });
    expect(first.ok).toBe(true);
    expect((await createReservation(checkout(), { now: NOW, db })).ok).toBe(false);
    const later = new Date(NOW.getTime() + 21 * 60_000);
    // Even before the sweeper runs, an expired hold no longer counts
    expect((await createReservation(checkout(), { now: later, db })).ok).toBe(true);
    const expired = await expireStaleHolds(later, db);
    expect(expired).toHaveLength(1);
    expect(await expireStaleHolds(later, db)).toHaveLength(0);
    const ev = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.toStatus, "EXPIRED"));
    expect(ev).toHaveLength(1);
  });

  it("rejects bad input, closed ordering, sold-out dishes and tampered slots", async () => {
    expect(await createReservation(checkout({ phone: "123" }), { now: NOW, db })).toMatchObject({ ok: false, code: "INVALID" });
    expect(await createReservation(checkout({ acceptTerms: false }), { now: NOW, db })).toMatchObject({ ok: false, code: "INVALID" });
    expect(await createReservation(checkout({ pickupTime: "18:15" }), { now: NOW, db })).toMatchObject({ ok: false, code: "SLOT" });
    expect(await createReservation(checkout({ pickupDate: "2026-11-05", pickupTime: "18:00" }), { now: NOW, db })).toMatchObject({ ok: false, code: "SLOT" });
    expect(await createReservation(checkout({ lines: [{ menuItemId: biryaniId, quantity: 1, choiceIds: [] }] }), { now: NOW, db })).toMatchObject({ ok: false, code: "CART" });
    await db.update(schema.businessSettings).set({ acceptingOrders: false });
    expect(await createReservation(checkout(), { now: NOW, db })).toMatchObject({ ok: false, code: "CLOSED" });
  });
});

describe("availabilityForCart", () => {
  it("reflects live bookings in remaining slot capacity", async () => {
    await createReservation(checkout(), { now: NOW, db });
    const { days } = await availabilityForCart([{ menuItemId: biryaniId, quantity: 1 }], NOW, db);
    const slot = days.find((d) => d.date === FRI)!.slots.find((s) => s.time === "18:00")!;
    expect(slot.remaining).toBe(3);
  });
});
