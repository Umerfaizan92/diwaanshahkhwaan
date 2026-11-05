import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { resetDb, closeDb } from "./helpers";
import { schema, type DB } from "@/lib/db";
import { setSendersForTests, type EmailSender, type SmsSender } from "@/lib/server/messaging";
import { completeReset, completeSetup, ownerExists, requestResetCode, requestSetupCode } from "@/lib/server/owner-access";
import { verifyPassword } from "@/lib/server/auth";

class Inbox implements EmailSender, SmsSender {
  readonly name = "fake";
  readonly configured = true;
  msgs: { to: string; text: string }[] = [];
  async send(m: { to: string; text?: string; body?: string }) {
    this.msgs.push({ to: m.to, text: m.text ?? m.body ?? "" });
    return { ok: true as const, id: String(this.msgs.length) };
  }
  lastCode(to: string) {
    const m = [...this.msgs].reverse().find((x) => x.to === to && /\b\d{6}\b/.test(x.text));
    return m?.text.match(/\b(\d{6})\b/)?.[1] ?? "";
  }
}

let db: DB;
let inbox: Inbox;
beforeAll(async () => {
  db = await resetDb();
  await db.update(schema.businessSettings).set({ ownerNotifyPhone: "0452 401 786" });
});
beforeEach(() => {
  inbox = new Inbox();
  setSendersForTests(inbox, inbox);
});
afterAll(async () => {
  setSendersForTests(null, null);
  await closeDb();
});

describe("first-time owner setup", () => {
  it("only accepts the business mobile on record, verifies a code sent to mobile and email, then is closed", async () => {
    expect(await ownerExists(db)).toBe(false);
    const wrong = await requestSetupCode({ name: "Intruder", email: "x@example.com", phone: "0411 111 111" }, db);
    expect(wrong.ok).toBe(false);
    expect(inbox.msgs).toHaveLength(0);

    const r = await requestSetupCode({ name: "Sayed Hasnain Shah", email: "owner@example.com", phone: "+61 452 401 786" }, db);
    expect(r.ok).toBe(true);
    const code = inbox.lastCode("owner@example.com");
    expect(code).toMatch(/^\d{6}$/);
    expect(inbox.lastCode("0452 401 786")).toBe(code); // texted to the business mobile too

    // Codes are never stored in plain text
    const [row] = await db.select().from(schema.ownerCodes);
    expect(row.codeHash).not.toContain(code);

    expect((await completeSetup({ email: "owner@example.com", code, password: "short", confirm: "short" }, db)).ok).toBe(false);
    const wrongCode = code === "000000" ? "111111" : "000000";
    expect((await completeSetup({ email: "owner@example.com", code: wrongCode, password: "Strong-pass-123", confirm: "Strong-pass-123" }, db)).ok).toBe(false);
    const ok = await completeSetup({ email: "owner@example.com", code, password: "Strong-pass-123", confirm: "Strong-pass-123" }, db);
    expect(ok.ok).toBe(true);
    const [u] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, "owner@example.com"));
    expect(u.role).toBe("OWNER");
    expect(await verifyPassword("Strong-pass-123", u.passwordHash)).toBe(true);

    // The same code can't be reused, and setup is closed once an owner exists
    expect((await completeSetup({ email: "owner@example.com", code, password: "Other-pass-1234", confirm: "Other-pass-1234" }, db)).ok).toBe(false);
    expect((await requestSetupCode({ name: "Someone", email: "s@example.com", phone: "0452 401 786" }, db)).ok).toBe(false);
  });
});

describe("forgot password", () => {
  it("gives the same answer for unknown emails and sends nothing", async () => {
    const r = await requestResetCode({ email: "nobody@example.com" }, db);
    expect(r.ok).toBe(true);
    expect(inbox.msgs).toHaveLength(0);
  });

  it("resets with a code sent to the owner's email and mobile, signs out other devices and notifies the owner", async () => {
    const [u] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, "owner@example.com"));
    await db.insert(schema.sessions).values({ kind: "STAFF", subjectId: u.id, expiresAt: new Date(Date.now() + 3600_000) });
    await requestResetCode({ email: "owner@example.com" }, db);
    const code = inbox.lastCode("owner@example.com");
    expect(inbox.lastCode("0452 401 786")).toBe(code);
    const r = await completeReset({ email: "owner@example.com", code, password: "Brand-new-pass-9", confirm: "Brand-new-pass-9" }, db);
    expect(r.ok).toBe(true);
    const [after] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.id, u.id));
    expect(await verifyPassword("Brand-new-pass-9", after.passwordHash)).toBe(true);
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.subjectId, u.id))).toHaveLength(0);
    expect(inbox.msgs.some((m) => /password was just changed/.test(m.text))).toBe(true);
  });

  it("locks a code after 5 wrong attempts and expires codes", async () => {
    await requestResetCode({ email: "owner@example.com" }, db);
    const code = inbox.lastCode("owner@example.com");
    const bad = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await completeReset({ email: "owner@example.com", code: bad, password: "Another-pass-77", confirm: "Another-pass-77" }, db);
    const locked = await completeReset({ email: "owner@example.com", code, password: "Another-pass-77", confirm: "Another-pass-77" }, db);
    expect(locked.ok).toBe(false);

    await requestResetCode({ email: "owner@example.com" }, db);
    const fresh = inbox.lastCode("owner@example.com");
    await db.update(schema.ownerCodes).set({ expiresAt: sql`now() - interval '1 minute'` });
    expect((await completeReset({ email: "owner@example.com", code: fresh, password: "Another-pass-77", confirm: "Another-pass-77" }, db)).ok).toBe(false);
  });
});
