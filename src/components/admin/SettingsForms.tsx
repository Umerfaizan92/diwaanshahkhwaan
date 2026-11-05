"use client";

import { useState } from "react";
import { saveNotificationSettingsAction, saveSettingsAction } from "@/app/admin/(panel)/actions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "./MenuRow";
import { Msg, useAction } from "./widgets";

type Contact = { name: string | null; phone: string; role: string };
type S = {
  businessName: string;
  legalName: string | null;
  tagline: string;
  abn: string | null;
  email: string | null;
  contacts: Contact[];
  pickupArea: string;
  pickupAddress: string | null;
  pickupInstructions: string | null;
  announcement: string | null;
  gstRegistered: boolean;
};

export function BusinessSettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const { pending, msg, errors, run } = useAction();
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => ({ ...p, [k]: v }));
  const setContact = (i: number, patch: Partial<Contact>) => set("contacts", s.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSettingsAction({ ...s, abn: s.abn ?? "", email: s.email ?? "", legalName: s.legalName || null, pickupAddress: s.pickupAddress || null, pickupInstructions: s.pickupInstructions || null, announcement: s.announcement || null }));
      }}
      className="space-y-6"
      noValidate
    >
      <Msg msg={msg} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="bn" label="Business name" error={errors.businessName} required>
          <Input id="bn" value={s.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </Field>
        <Field id="ln" label="Legal / trading entity name" hint="Shown on receipts if different">
          <Input id="ln" value={s.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} />
        </Field>
        <Field id="tg" label="Tagline" required>
          <Input id="tg" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field id="abn" label="ABN" error={errors.abn} hint="Checked against the ATO checksum">
          <Input id="abn" value={s.abn ?? ""} inputMode="numeric" onChange={(e) => set("abn", e.target.value)} error={errors.abn} />
        </Field>
        <Field id="em" label="Business email" error={errors.email}>
          <Input id="em" type="email" value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} error={errors.email} />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold">Phone numbers shown on the site</legend>
        {s.contacts.map((c, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input id={`cp-${i}`} aria-label="Phone" value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} error={errors[`contacts.${i}.phone`]} placeholder="04xx xxx xxx" />
            <Input id={`cn-${i}`} aria-label="Contact name" value={c.name ?? ""} onChange={(e) => setContact(i, { name: e.target.value })} placeholder="Name (optional)" />
            <Input id={`cr-${i}`} aria-label="Role" value={c.role} onChange={(e) => setContact(i, { role: e.target.value })} placeholder="e.g. Orders & enquiries" />
            <button type="button" onClick={() => set("contacts", s.contacts.filter((_, j) => j !== i))} disabled={s.contacts.length <= 1} className="text-sm text-muted hover:text-danger disabled:opacity-30">
              Remove
            </button>
            {errors[`contacts.${i}.phone`] ? <p className="text-sm text-danger sm:col-span-4">{errors[`contacts.${i}.phone`]}</p> : null}
          </div>
        ))}
        {s.contacts.length < 5 ? (
          <button type="button" onClick={() => set("contacts", [...s.contacts, { name: "", phone: "", role: "Orders & enquiries" }])} className="text-sm font-semibold text-gold">
            + Add phone number
          </button>
        ) : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="pa" label="Pickup area (public)" hint="Shown everywhere, e.g. Langford WA 6147" required>
          <Input id="pa" value={s.pickupArea} onChange={(e) => set("pickupArea", e.target.value)} />
        </Field>
        <Field id="ann" label="Announcement banner" hint="Optional message across the top of the site">
          <Input id="ann" value={s.announcement ?? ""} onChange={(e) => set("announcement", e.target.value)} />
        </Field>
        <Field id="padd" label="Exact pickup address (private)" hint="Only shown to customers after they've paid">
          <Textarea id="padd" className="min-h-20" value={s.pickupAddress ?? ""} onChange={(e) => set("pickupAddress", e.target.value)} />
        </Field>
        <Field id="pi" label="Pickup instructions">
          <Textarea id="pi" className="min-h-20" value={s.pickupInstructions ?? ""} onChange={(e) => set("pickupInstructions", e.target.value)} />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <Switch checked={s.gstRegistered} onChange={(v) => set("gstRegistered", v)} label="Registered for GST" />
        <span className="text-sm">
          <strong>Registered for GST</strong>
          <span className="block text-muted">
            When on (with an ABN), receipts become tax invoices and GST is calculated per dish using each dish&apos;s GST setting. Confirm your registration and each dish&apos;s
            treatment with your accountant or the ATO before switching this on.
          </span>
        </span>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save business settings"}
      </Button>
    </form>
  );
}

type N = { notifyEmailEnabled: boolean; notifySmsEnabled: boolean; notifyOwnerNewOrder: boolean; ownerNotifyEmail: string | null; reminderHoursBefore: number };

export function NotificationSettingsForm({ initial, emailConfigured, smsConfigured }: { initial: N; emailConfigured: boolean; smsConfigured: boolean }) {
  const [n, setN] = useState(initial);
  const { pending, msg, errors, run } = useAction();
  const set = <K extends keyof N>(k: K, v: N[K]) => setN((p) => ({ ...p, [k]: v }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveNotificationSettingsAction({ ...n, ownerNotifyEmail: n.ownerNotifyEmail ?? "" }));
      }}
      className="space-y-4"
    >
      <Msg msg={msg} />
      {!emailConfigured ? <p className="text-sm text-warning">No email provider is configured yet, so emails are logged but not sent. Set EMAIL_PROVIDER and its key on the server.</p> : null}
      <label className="flex items-center gap-3">
        <Switch checked={n.notifyEmailEnabled} onChange={(v) => set("notifyEmailEnabled", v)} label="Email customers" />
        Email customers (confirmations, updates, ready, reminders, refunds)
      </label>
      <label className="flex items-center gap-3">
        <Switch checked={n.notifySmsEnabled} onChange={(v) => set("notifySmsEnabled", v)} label="Text customers" disabled={!smsConfigured} />
        Text customers who opt in {smsConfigured ? "" : "(SMS provider not configured)"}
      </label>
      <label className="flex items-center gap-3">
        <Switch checked={n.notifyOwnerNewOrder} onChange={(v) => set("notifyOwnerNewOrder", v)} label="Email me new orders" />
        Email me when a new order is paid
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="oe" label="Send new-order emails to" error={errors.ownerNotifyEmail}>
          <Input id="oe" type="email" value={n.ownerNotifyEmail ?? ""} onChange={(e) => set("ownerNotifyEmail", e.target.value)} />
        </Field>
        <Field id="rh" label="Pickup reminder (hours before)" hint="0 turns reminders off">
          <Input id="rh" type="number" min={0} max={48} value={n.reminderHoursBefore} onChange={(e) => set("reminderHoursBefore", Number(e.target.value) || 0)} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        Save notification settings
      </Button>
    </form>
  );
}
