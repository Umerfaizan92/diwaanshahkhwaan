"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ownerResetCompleteAction, ownerResetRequestAction, ownerSetupCompleteAction, ownerSetupRequestAction } from "./actions";
import { Alert, Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Msg = { tone: "error" | "success" | "info"; text: string } | null;

/** A strong random password from the browser's secure random generator */
function generatePassword(length = 18) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?-_"];
  const all = sets.join("");
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const out = sets.map(pick); // at least one of each kind
  while (out.length < length) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

function strength(p: string) {
  let s = 0;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s <= 2 ? { label: "Weak", cls: "w-1/3 bg-danger" } : s <= 3 ? { label: "Good", cls: "w-2/3 bg-warning" } : { label: "Strong", cls: "w-full bg-success" };
}

/** Password + confirm, with "Generate strong password", show/hide and copy */
function NewPassword({ pw, setPw, confirm, setConfirm, errors }: { pw: string; setPw: (v: string) => void; confirm: string; setConfirm: (v: string) => void; errors: Record<string, string> }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const st = strength(pw);
  return (
    <div className="space-y-4">
      <Field id="new-pw" label="New password" error={errors.password} hint="12+ characters with letters and numbers" required>
        <div className="relative">
          <Input id="new-pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={errors.password} className="pr-20" required />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-sm font-semibold text-gold">
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </Field>
      {pw ? (
        <div aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className={`h-full rounded-full transition-all ${st.cls}`} />
          </div>
          <p className="mt-1 text-xs text-muted">Strength: {st.label}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const g = generatePassword();
            setPw(g);
            setConfirm(g);
            setShow(true);
            setCopied(false);
          }}
          className="rounded-full border border-gold/60 px-4 py-2 text-sm font-semibold text-text hover:bg-gold/10"
        >
          Generate strong password
        </button>
        {pw ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pw);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-text"
          >
            {copied ? "Copied" : "Copy password"}
          </button>
        ) : null}
      </div>
      <Field id="confirm-pw" label="Confirm new password" error={errors.confirm} required>
        <Input id="confirm-pw" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
      </Field>
      <p className="text-xs text-muted">Save it in your phone&apos;s password manager. Nobody from the website will ever ask you for it.</p>
    </div>
  );
}

function CodeField({ value, setValue, error }: { value: string; setValue: (v: string) => void; error?: string }) {
  return (
    <Field id="code" label="6-digit code" error={error} required>
      <Input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="text-center font-display text-2xl tracking-[0.5em]"
        required
      />
    </Field>
  );
}

const Secure = () => (
  <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
    <svg viewBox="0 0 20 20" className="size-4 text-success" aria-hidden>
      <rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
    Encrypted connection · codes expire in 10 minutes and work once
  </p>
);

/* ---------------- First-time owner setup ---------------- */

export function OwnerSetup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const sendCode = () =>
    start(async () => {
      setMsg(null);
      const r = await ownerSetupRequestAction({ name, email, phone });
      if (r.ok) {
        setErrors({});
        setStep(2);
        setMsg({ tone: "success", text: `Code sent to ${r.masked?.phone ?? "your mobile"} and ${r.masked?.email ?? "your email"}.` });
      } else {
        setErrors(r.fieldErrors ?? {});
        setMsg({ tone: "error", text: r.error });
      }
    });

  return (
    <div className="space-y-5">
      <Alert tone="info">
        <strong>Set up the owner account.</strong> This only appears once. For security, a code is sent to the business mobile number on record and to your email.
      </Alert>
      {msg ? <Alert tone={msg.tone === "error" ? "error" : "success"}>{msg.text}</Alert> : null}
      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <Field id="o-name" label="Your name" error={errors.name} required>
            <Input id="o-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
          </Field>
          <Field id="o-email" label="Email" error={errors.email} hint="You'll sign in with this" required>
            <Input id="o-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
          </Field>
          <Field id="o-phone" label="Business mobile number" error={errors.phone} hint="Must match the business number on record" required>
            <Input id="o-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="04xx xxx xxx" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending code…" : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await ownerSetupCompleteAction({ email, code, password: pw, confirm });
              if (r && !r.ok) {
                setErrors(r.fieldErrors ?? {});
                setMsg({ tone: "error", text: r.error });
              }
            });
          }}
        >
          <CodeField value={code} setValue={setCode} error={errors.code} />
          <NewPassword pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} errors={errors} />
          <Button type="submit" size="lg" className="w-full" disabled={pending || code.length !== 6}>
            {pending ? "Creating your account…" : "Create owner account"}
          </Button>
          <button type="button" onClick={sendCode} disabled={pending} className="w-full text-center text-sm text-muted underline">
            Didn&apos;t get it? Send a new code
          </button>
        </form>
      )}
      <Secure />
    </div>
  );
}

/* ---------------- Forgot password ---------------- */

export function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const sendCode = () =>
    start(async () => {
      const r = await ownerResetRequestAction({ email });
      if (r.ok) {
        setErrors({});
        setStep(2);
        setMsg({ tone: "success", text: r.message });
      } else {
        setErrors(r.fieldErrors ?? {});
        setMsg({ tone: "error", text: r.error });
      }
    });

  if (step === 3) {
    return (
      <div className="space-y-5">
        <Alert tone="success">{msg?.text ?? "Your password has been changed."}</Alert>
        <Link href="/admin/login" className="flex h-13 w-full items-center justify-center rounded-full bg-gold font-semibold text-gold-ink">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {msg ? <Alert tone={msg.tone === "error" ? "error" : "success"}>{msg.text}</Alert> : null}
      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <p className="text-sm text-muted">Enter the owner email. We&apos;ll send a 6-digit code to the owner&apos;s email and mobile to confirm it&apos;s you.</p>
          <Field id="f-email" label="Owner email" error={errors.email} required>
            <Input id="f-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending code…" : "Send reset code"}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await ownerResetCompleteAction({ email, code, password: pw, confirm });
              if (r.ok) {
                setMsg({ tone: "success", text: r.message });
                setStep(3);
              } else {
                setErrors(r.fieldErrors ?? {});
                setMsg({ tone: "error", text: r.error });
              }
            });
          }}
        >
          <CodeField value={code} setValue={setCode} error={errors.code} />
          <NewPassword pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} errors={errors} />
          <Button type="submit" size="lg" className="w-full" disabled={pending || code.length !== 6}>
            {pending ? "Saving…" : "Set new password"}
          </Button>
          <button type="button" onClick={sendCode} disabled={pending} className="w-full text-center text-sm text-muted underline">
            Didn&apos;t get it? Send a new code
          </button>
        </form>
      )}
      <Secure />
      <Link href="/admin/login" className="block text-center text-sm text-muted underline">
        Back to sign in
      </Link>
    </div>
  );
}
