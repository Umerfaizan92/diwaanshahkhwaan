import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/server/env";

const base = { NODE_ENV: "production", DATABASE_URL: "postgres://x", AUTH_SECRET: "x".repeat(40), APP_URL: "https://dsk.example", PAYMENT_PROVIDER: "demo", DEMO_PAYMENT_SECRET: "y".repeat(30), CRON_SECRET: "z".repeat(20) } as NodeJS.ProcessEnv;

describe("checkEnv", () => {
  it("accepts a valid staging configuration", () => {
    expect(checkEnv(base).errors).toEqual([]);
  });
  it("rejects missing secrets and dev secrets in production", () => {
    expect(checkEnv({ ...base, AUTH_SECRET: "short" }).errors.length).toBe(1);
    expect(checkEnv({ ...base, AUTH_SECRET: "dev-" + "x".repeat(40) }).errors.length).toBe(1);
  });
  it("blocks live Stripe keys without owner approval, and demo payments on the public site", () => {
    const stripe = { ...base, PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_WEBHOOK_SECRET: "whsec_x" };
    expect(checkEnv(stripe).errors).toContain("Live Stripe keys are set without ALLOW_LIVE_PAYMENTS=true (owner approval required)");
    expect(checkEnv({ ...stripe, ALLOW_LIVE_PAYMENTS: "true" }).errors).toEqual([]);
    expect(checkEnv({ ...stripe, STRIPE_SECRET_KEY: "sk_test_abc" }).mode.live).toBe(false);
    expect(checkEnv({ ...base, SITE_INDEXABLE: "true" }).errors.length).toBe(1);
  });
});
