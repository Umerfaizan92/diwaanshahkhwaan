import "server-only";

export type SendResult = { ok: true; id: string } | { ok: false; error: string; permanent?: boolean };

export interface EmailSender {
  readonly name: string;
  readonly configured: boolean;
  send(m: { to: string; subject: string; html: string; text: string; idempotencyKey: string }): Promise<SendResult>;
}
export interface SmsSender {
  readonly name: string;
  readonly configured: boolean;
  send(m: { to: string; body: string; idempotencyKey: string }): Promise<SendResult>;
}

/** Development / not-yet-configured: logs instead of sending, so the queue still completes */
class ConsoleEmail implements EmailSender {
  readonly name = "console";
  readonly configured = false;
  async send(m: { to: string; subject: string }) {
    console.info(`[email:console] to=${m.to.replace(/(.{2}).+@/, "$1***@")} subject="${m.subject}"`);
    return { ok: true as const, id: `console-${Date.now()}` };
  }
}

class ResendEmail implements EmailSender {
  readonly name = "resend";
  readonly configured = true;
  constructor(
    private key: string,
    private from: string,
  ) {}
  async send(m: { to: string; subject: string; html: string; text: string; idempotencyKey: string }): Promise<SendResult> {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "Idempotency-Key": m.idempotencyKey },
        body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
      if (r.ok && body.id) return { ok: true, id: body.id };
      return { ok: false, error: `Resend ${r.status}: ${body.message ?? "error"}`, permanent: r.status === 422 || r.status === 403 };
    } catch (e) {
      return { ok: false, error: `Resend network error: ${(e as Error).message}` };
    }
  }
}

class TwilioSms implements SmsSender {
  readonly name = "twilio";
  readonly configured = true;
  constructor(
    private sid: string,
    private token: string,
    private from: string,
  ) {}
  async send(m: { to: string; body: string }): Promise<SendResult> {
    const to = m.to.replace(/\s/g, "").replace(/^0/, "+61");
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + Buffer.from(`${this.sid}:${this.token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: this.from, Body: m.body.slice(0, 600) }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await r.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (r.ok && body.sid) return { ok: true, id: body.sid };
      return { ok: false, error: `Twilio ${r.status}: ${body.message ?? "error"}`, permanent: r.status === 400 };
    } catch (e) {
      return { ok: false, error: `Twilio network error: ${(e as Error).message}` };
    }
  }
}

class NoSms implements SmsSender {
  readonly name = "none";
  readonly configured = false;
  async send() {
    return { ok: false as const, error: "SMS is not configured", permanent: true };
  }
}

let emailOverride: EmailSender | null = null;
let smsOverride: SmsSender | null = null;
export function setSendersForTests(e: EmailSender | null, s: SmsSender | null) {
  emailOverride = e;
  smsOverride = s;
}

export function getEmailSender(): EmailSender {
  if (emailOverride) return emailOverride;
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return new ResendEmail(process.env.RESEND_API_KEY, process.env.EMAIL_FROM);
  return new ConsoleEmail();
}
export function getSmsSender(): SmsSender {
  if (smsOverride) return smsOverride;
  if (process.env.SMS_PROVIDER === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) return new TwilioSms(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_FROM);
  return new NoSms();
}
