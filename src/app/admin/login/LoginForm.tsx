"use client";

import { useActionState } from "react";
import { staffLogin } from "./actions";
import { Alert, Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, action, pending] = useActionState(staffLogin, {});
  return (
    <form action={action} className="space-y-5">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email} key={state.email ?? ""} required />
      </Field>
      <Field id="password" label="Password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
