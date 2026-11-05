import { describe, expect, it } from "vitest";
import { formatCents, formatCentsShort, gstFromInclusive, parseDollarsToCents } from "@/lib/domain/money";
import { formatHoursSummary, formatTime12 } from "@/lib/domain/hours";
import { contactSchema, normaliseAuPhone } from "@/lib/domain/validation";
import { toTelHref } from "@/lib/config/business";

describe("money", () => {
  it("formats AUD", () => {
    expect(formatCents(1250)).toBe("$12.50");
    expect(formatCentsShort(1200)).toBe("$12");
    expect(formatCentsShort(1250)).toBe("$12.50");
  });
  it("parses dollar input strictly", () => {
    expect(parseDollarsToCents("12")).toBe(1200);
    expect(parseDollarsToCents("$12.5")).toBe(1250);
    expect(parseDollarsToCents("0.05")).toBe(5);
    expect(parseDollarsToCents("12.345")).toBeNull();
    expect(parseDollarsToCents("-1")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
  });
  it("derives GST as 1/11 of an inclusive price", () => {
    expect(gstFromInclusive(1100)).toBe(100);
    expect(gstFromInclusive(2000)).toBe(182);
    expect(gstFromInclusive(0)).toBe(0);
  });
});

describe("hours", () => {
  it("formats 12h times", () => {
    expect(formatTime12("00:00")).toBe("12am");
    expect(formatTime12("12:00")).toBe("12pm");
    expect(formatTime12("13:30")).toBe("1:30pm");
  });
  it("groups identical consecutive days Monday-first", () => {
    const h = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: d !== 1, openTime: "12:00", closeTime: d >= 5 || d === 0 ? "21:00" : "20:00" }));
    expect(formatHoursSummary(h)).toEqual(["Mon Closed", "Tue–Thu 12pm–8pm", "Fri–Sun 12pm–9pm"]);
  });
});

describe("Australian phone validation", () => {
  it("normalises mobiles and landlines", () => {
    expect(normaliseAuPhone("0452401786")).toBe("0452 401 786");
    expect(normaliseAuPhone("+61 452 401 786")).toBe("0452 401 786");
    expect(normaliseAuPhone("(08) 9123 4567")).toBe("08 9123 4567");
  });
  it("rejects non-Australian numbers", () => {
    expect(normaliseAuPhone("12345")).toBeNull();
    expect(normaliseAuPhone("+1 415 555 0100")).toBeNull();
  });
  it("builds tel: links", () => {
    expect(toTelHref("0452 401 786")).toBe("tel:+61452401786");
  });
  it("validates the contact form", () => {
    const ok = contactSchema.safeParse({ name: "Ali", email: "A@B.COM ", phone: "0412 345 678", topic: "bulk", message: "Hello there team" });
    expect(ok.success && ok.data.email).toBe("a@b.com");
    const bad = contactSchema.safeParse({ name: "A", email: "x", phone: "123", message: "short" });
    expect(bad.success).toBe(false);
  });
});
