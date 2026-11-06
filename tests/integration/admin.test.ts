import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { resetDb, closeDb, owner } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { createReservation } from "@/lib/server/orders";
import { handlePaymentEvent, startPayment } from "@/lib/server/payments";
import { setPaymentProviderForTests, type PaymentProvider } from "@/lib/server/payment-providers";
import { productionPlan, staffTransition } from "@/lib/server/admin-orders";
import { createStaff, deleteMedia, isValidAbn, saveSettings, updateStaff, uploadMedia } from "@/lib/server/admin-misc";
import { salesReport, toCsv } from "@/lib/server/reports";
import { can, PERMISSIONS } from "@/lib/domain/permissions";
import type { StaffUser } from "@/lib/server/auth";

let db: DB;
let orderId = "";
const kitchen: StaffUser = { id: "k1", email: "kitchen@test", name: "Kitchen", role: "KITCHEN" };
const manager: StaffUser = { id: "m1", email: "manager@test", name: "Manager", role: "MANAGER" };

const provider: PaymentProvider = {
  name: "memory",
  isTestMode: true,
  createCheckout: async () => ({ sessionId: "s_" + randomUUID(), url: "https://pay.example" }),
  retrieveSession: async () => ({ status: "open", paymentId: null, amountCents: 0, currency: "aud" }),
  expireSession: async () => {},
  refund: async () => ({ refundId: "r", status: "SUCCEEDED" }),
  parseWebhook: async () => {
    throw new Error("unused");
  },
} as unknown as PaymentProvider;

beforeAll(async () => {
  db = await resetDb();
  setPaymentProviderForTests(provider);
  await db.update(schema.businessSettings).set({ minNoticeHours: 0, orderCutoffTime: null, maxAdvanceDays: 30 });
  await db.update(schema.openingHours).set({ isOpen: true, openTime: "00:00", closeTime: "23:30" });
  const b = await db.query.menuItems.findFirst({ where: eq(schema.menuItems.slug, "shahi-chicken-biryani"), with: { optionGroups: { with: { choices: true } } } });
  const hot = b!.optionGroups[0].choices.find((c) => c.name === "Hot")!.id;
  const date = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
  const r = await createReservation({ idempotencyKey: randomUUID().replace(/-/g, ""), lines: [{ menuItemId: b!.id, quantity: 3, choiceIds: [hot] }], name: "Zara", email: "zara@example.com", phone: "0400000000", pickupDate: date, pickupTime: "12:00", acceptTerms: true }, { db });
  if (!r.ok) throw new Error(r.error);
  orderId = r.order.id;
  await startPayment(orderId, { db });
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.orderId, orderId));
  await handlePaymentEvent("memory", { id: "e1", type: "payment.succeeded", sessionId: p.providerSessionId, paymentId: "pi", amountCents: 3600, currency: "aud" }, db);
});
afterAll(async () => {
  setPaymentProviderForTests(null);
  await closeDb();
});

describe("role-based access", () => {
  it("owner has every permission; kitchen only the kitchen workflow", () => {
    expect(PERMISSIONS.every((p) => can("OWNER", p))).toBe(true);
    expect(can("KITCHEN", "orders:update")).toBe(true);
    for (const p of ["orders:refund", "orders:cancel", "menu:edit", "settings:edit", "staff:manage", "audit:view", "reports:view", "payments:view", "customers:view"] as const) expect(can("KITCHEN", p)).toBe(false);
    for (const p of ["settings:edit", "staff:manage", "audit:view"] as const) expect(can("MANAGER", p)).toBe(false);
    expect(can(null, "dashboard:view")).toBe(false);
  });

  it("kitchen can move an order through the workflow but cannot cancel it", async () => {
    expect((await staffTransition(kitchen, orderId, "CANCELLED", "no", db)).ok).toBe(false);
    expect((await staffTransition(kitchen, orderId, "READY", null, db)).ok).toBe(false); // skipping steps
    for (const to of ["CONFIRMED", "PREPARING"] as const) expect((await staffTransition(kitchen, orderId, to, null, db)).ok).toBe(true);
    const ev = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, orderId));
    expect(ev.map((e) => e.toStatus)).toEqual(["PENDING_PAYMENT", "NEW", "CONFIRMED", "PREPARING"]);
  });

  it("cancellation needs a reason and the right role", async () => {
    expect((await staffTransition(manager, orderId, "CANCELLED", "", db)).ok).toBe(false);
    const r = await staffTransition(manager, orderId, "CANCELLED", "Kitchen illness", db);
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/refund/) });
    expect((await staffTransition(owner, orderId, "PREPARING", null, db)).ok).toBe(false);
    await db.update(schema.orders).set({ status: "PREPARING" }).where(eq(schema.orders.id, orderId));
  });
});

describe("kitchen production plan", () => {
  it("aggregates quantities by dish and option", async () => {
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    const plan = await productionPlan(o.pickupDate, db);
    expect(plan.dishes[0]).toMatchObject({ name: "Shahi Chicken Biryani", total: 3, variants: [["Hot", 3]] });
    expect(plan.slots[0][0]).toBe("12:00");
  });
});

describe("staff management guards", () => {
  it("creates staff, prevents removing the last owner or yourself, and revokes sessions on change", async () => {
    // Owner-only dashboard: other roles can't be created
    expect((await createStaff(owner, { name: "Cook One", email: "cook@example.com", role: "KITCHEN", password: "a-long-password!" }, db)).ok).toBe(false);
    expect((await createStaff(owner, { name: "Cook One", email: "cook@example.com", role: "OWNER", password: "short" }, db)).ok).toBe(false);
    expect((await createStaff(owner, { name: "Cook One", email: "cook@example.com", role: "OWNER", password: "a-long-password!" }, db)).ok).toBe(true);
    expect((await createStaff(owner, { name: "Cook Two", email: "cook@example.com", role: "OWNER", password: "a-long-password!" }, db)).ok).toBe(false);
    await createStaff(owner, { name: "Only Owner", email: "boss@example.com", role: "OWNER", password: "a-long-password!" }, db);
    const [boss] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, "boss@example.com"));
    expect((await updateStaff(owner, boss.id, { role: "KITCHEN" }, db)).ok).toBe(false);
    expect((await updateStaff({ ...owner, id: boss.id }, boss.id, { active: false }, db)).ok).toBe(false);
    const [cook] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, "cook@example.com"));
    await db.insert(schema.sessions).values({ kind: "STAFF", subjectId: cook.id, expiresAt: new Date(Date.now() + 3600_000) });
    expect((await updateStaff(owner, cook.id, { active: false }, db)).ok).toBe(true);
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.subjectId, cook.id))).toHaveLength(0);
  });
});

describe("business settings", () => {
  it("validates ABNs with the ATO checksum and requires one for GST registration", async () => {
    expect(isValidAbn("51824753556")).toBe(true); // ATO's published example
    expect(isValidAbn("51824753557")).toBe(false);
    const base = { businessName: "Diwaan Shah Khwaan", legalName: null, tagline: "Taste the Royalty", abn: "", email: "", contacts: [{ name: "Sayed Hasnain Shah", phone: "0452 401 786", role: "Orders" }], pickupArea: "Langford WA 6147", pickupAddress: null, pickupInstructions: null, announcement: null, gstRegistered: true, gstMode: "ADD_ON" as const, acceptCash: true, acceptCard: true, halalCertified: true, halalCertifier: "", halalCertNumber: "" };
    expect((await saveSettings(owner, base, db)).ok).toBe(false);
    expect((await saveSettings(owner, { ...base, abn: "51 824 753 557" }, db)).ok).toBe(false);
    expect((await saveSettings(owner, { ...base, abn: "51824753556", gstRegistered: false }, db)).ok).toBe(true);
    const [s] = await db.select().from(schema.businessSettings);
    expect(s.abn).toBe("51 824 753 556");
    expect((await saveSettings(owner, { ...base, abn: "51824753556", acceptCash: false, acceptCard: false }, db)).ok).toBe(false);
  });
});

describe("reports", () => {
  it("totals paid sales by Perth payment date", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth" }).format(new Date());
    const r = await salesReport(today, today, "Australia/Perth", db);
    expect(r.totals).toMatchObject({ orders: 1, gross: 3600, net: 3600 });
    expect(r.dishes[0]).toMatchObject({ name: "Shahi Chicken Biryani", qty: 3 });
  });
  it("escapes CSV and blocks spreadsheet formula injection", () => {
    expect(toCsv([["=HYPERLINK(1)", 'a"b', "x,y", 5]])).toBe(`'=HYPERLINK(1),"a""b","x,y",5`);
  });
});

describe("photo uploads", () => {
  it("re-encodes valid images to WebP and rejects non-images and oversized files", async () => {
    const png = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#c9a24a" } }).png().toBuffer();
    const ok = await uploadMedia(owner, new File([new Uint8Array(png)], "dish.png", { type: "image/png" }), "Test dish", db);
    expect(ok.ok).toBe(true);
    const [m] = await db.select().from(schema.media);
    expect(m).toMatchObject({ contentType: "image/webp", width: 1400, height: 1050 });
    expect((await uploadMedia(owner, new File([new Uint8Array([1, 2, 3])], "x.png", { type: "image/png" }), "", db)).ok).toBe(false);
    expect((await uploadMedia(owner, new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }), "", db)).ok).toBe(false);
    expect((await uploadMedia(owner, new File([new Uint8Array(9 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }), "", db)).ok).toBe(false);
    // In-use photos can't be deleted
    await db.update(schema.menuItems).set({ imagePath: `media:${m.id}` }).where(eq(schema.menuItems.slug, "shahi-kheer"));
    expect((await deleteMedia(owner, m.id, db)).ok).toBe(false);
    await db.update(schema.menuItems).set({ imagePath: null }).where(eq(schema.menuItems.slug, "shahi-kheer"));
    expect((await deleteMedia(owner, m.id, db)).ok).toBe(true);
    const logs = await db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLogs).where(sql`${schema.auditLogs.action} like 'media.%'`);
    expect(logs[0].n).toBe(2);
  });
});
