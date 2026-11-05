"use client";

import { useActionState, useState } from "react";
import { loginCustomer, registerCustomer, updateCustomer, type AccountState } from "./actions";
import { Alert, Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, loginAction, loginPending] = useActionState<AccountState, FormData>(loginCustomer, {});
  const [reg, regAction, regPending] = useActionState<AccountState, FormData>(registerCustomer, {});
  return (
    <div className="mx-auto max-w-md">
      <div role="tablist" aria-label="Sign in or create an account" className="mb-6 grid grid-cols-2 rounded-full border border-line p-1">
        {(["login", "register"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-full py-2 text-sm font-semibold ${mode === m ? "bg-gold text-gold-ink" : "text-muted"}`}>
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      {mode === "login" ? (
        <form action={loginAction} className="space-y-5" role="tabpanel">
          <input type="hidden" name="next" value={next} />
          {login.error ? <Alert tone="error">{login.error}</Alert> : null}
          <Field id="l-email" label="Email" required>
            <Input id="l-email" name="email" type="email" autoComplete="email" defaultValue={login.values?.email} key={login.values?.email} required />
          </Field>
          <Field id="l-pw" label="Password" required>
            <Input id="l-pw" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loginPending}>
            {loginPending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted">Forgot your password? Call us and we&apos;ll help you reset it.</p>
        </form>
      ) : (
        <form action={regAction} className="space-y-5" role="tabpanel">
          <input type="hidden" name="next" value={next} />
          {reg.error ? <Alert tone="error">{reg.error}</Alert> : null}
          <Field id="r-name" label="Name" error={reg.errors?.name} required>
            <Input id="r-name" name="name" autoComplete="name" defaultValue={reg.values?.name} error={reg.errors?.name} required />
          </Field>
          <Field id="r-email" label="Email" error={reg.errors?.email} required>
            <Input id="r-email" name="email" type="email" autoComplete="email" defaultValue={reg.values?.email} error={reg.errors?.email} required />
          </Field>
          <Field id="r-phone" label="Mobile" error={reg.errors?.phone} required>
            <Input id="r-phone" name="phone" type="tel" autoComplete="tel" defaultValue={reg.values?.phone} error={reg.errors?.phone} required />
          </Field>
          <Field id="r-pw" label="Password" error={reg.errors?.password} hint="At least 10 characters" required>
            <Input id="r-pw" name="password" type="password" autoComplete="new-password" error={reg.errors?.password} required />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={regPending}>
            {regPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function DetailsForm({ name, phone }: { name: string; phone: string }) {
  const [s, action, pending] = useActionState<AccountState, FormData>(updateCustomer, {});
  return (
    <form action={action} className="space-y-4">
      {s.errors?._ok ? <Alert tone="success">{s.errors._ok}</Alert> : null}
      <Field id="d-name" label="Name" error={s.errors?.name} required>
        <Input id="d-name" name="name" defaultValue={s.values?.name ?? name} error={s.errors?.name} />
      </Field>
      <Field id="d-phone" label="Mobile" error={s.errors?.phone} required>
        <Input id="d-phone" name="phone" type="tel" defaultValue={s.values?.phone ?? phone} error={s.errors?.phone} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Save details
      </Button>
    </form>
  );
}
