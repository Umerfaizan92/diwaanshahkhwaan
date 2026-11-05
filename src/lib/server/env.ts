import "server-only";

export type EnvReport = { errors: string[]; warnings: string[]; mode: { payments: string; live: boolean; email: string; sms: string; indexable: boolean } };

/** Checks configuration at boot and for the health endpoint. Never returns secret values. */
export function checkEnv(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prod = env.NODE_ENV === "production";
  if (!env.DATABASE_URL) errors.push("DATABASE_URL is not set");
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) errors.push("AUTH_SECRET must be at least 32 characters");
  if (prod && env.AUTH_SECRET?.startsWith("dev-")) errors.push("AUTH_SECRET is still the development value");
  const url = env.APP_URL || env.RENDER_EXTERNAL_URL;
  if (!url) warnings.push("APP_URL is not set; links in emails will point to localhost");
  else if (prod && !url.startsWith("https://")) warnings.push("APP_URL should use https:// in production");

  const payments = env.PAYMENT_PROVIDER ?? "demo";
  let live = false;
  if (payments === "stripe") {
    if (!env.STRIPE_SECRET_KEY) errors.push("PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not set");
    if (!env.STRIPE_WEBHOOK_SECRET) errors.push("PAYMENT_PROVIDER=stripe but STRIPE_WEBHOOK_SECRET is not set");
    live = !!env.STRIPE_SECRET_KEY && !/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY);
    if (live && env.ALLOW_LIVE_PAYMENTS !== "true") errors.push("Live Stripe keys are set without ALLOW_LIVE_PAYMENTS=true (owner approval required)");
  } else if (payments === "demo") {
    if (!env.DEMO_PAYMENT_SECRET || env.DEMO_PAYMENT_SECRET.length < 24) errors.push("DEMO_PAYMENT_SECRET must be at least 24 characters");
    if (env.SITE_INDEXABLE === "true") errors.push("The demo (test) payment provider must not be used on the public, indexable site");
    warnings.push("Test mode: the demo payment provider never takes real money");
  } else errors.push(`Unknown PAYMENT_PROVIDER "${payments}"`);

  const email = env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY && env.EMAIL_FROM ? "resend" : "console";
  if (email === "console") warnings.push("No email provider configured: emails are logged, not sent");
  const sms = env.SMS_PROVIDER === "twilio" && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM ? "twilio" : "none";
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) warnings.push("CRON_SECRET not set: /api/cron/sweep is disabled (the in-process worker still runs)");
  return { errors, warnings, mode: { payments, live, email, sms, indexable: env.SITE_INDEXABLE === "true" } };
}
