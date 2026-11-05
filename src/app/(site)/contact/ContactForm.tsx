"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "./actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ContactForm({ topic }: { topic: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { ok: false });
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.ok) {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <form action={action} noValidate className="space-y-5">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label="Name" error={e.name} required>
          <Input id="c-name" name="name" autoComplete="name" defaultValue={v.name} error={e.name} required />
        </Field>
        <Field id="c-phone" label="Phone" error={e.phone}>
          <Input id="c-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} placeholder="04xx xxx xxx" />
        </Field>
      </div>
      <Field id="c-email" label="Email" error={e.email} required>
        <Input id="c-email" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} required />
      </Field>
      <Field id="c-topic" label="What's it about?" required>
        <Select id="c-topic" name="topic" defaultValue={v.topic ?? topic}>
          <option value="general">General question</option>
          <option value="bulk">Bulk or BBQ order for an event</option>
          <option value="order">An order I&apos;ve placed</option>
          <option value="allergy">Allergy or dietary question</option>
        </Select>
      </Field>
      <Field id="c-message" label="Message" error={e.message} required hint="For bulk orders, include the date, number of guests and what you'd like.">
        <Textarea id="c-message" name="message" defaultValue={v.message} error={e.message} required />
      </Field>
      <div aria-hidden className="hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
