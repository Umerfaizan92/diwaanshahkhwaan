"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import {
  clearAttentionAction,
  createStaffAction,
  deleteMediaAction,
  reconcileAction,
  refundAction,
  saveCustomerNoteAction,
  setMessageHandledAction,
  transitionAction,
  updateStaffAction,
  uploadMediaAction,
  retryJobAction,
  cancelJobAction,
  resendNotificationAction,
  sendTestEmailAction,
} from "@/app/admin/(panel)/actions";
import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { ROLE_LABEL, ROLES } from "@/lib/domain/permissions";
import { formatCents } from "@/lib/domain/money";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type R = { ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

function newKey() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = (fn: () => Promise<R>, after?: (r: R) => void) =>
    start(async () => {
      const r = await fn();
      setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
      setMsg(r.ok ? (r.message ? { tone: "success", text: r.message } : null) : { tone: "error", text: r.error ?? "Failed" });
      after?.(r);
      router.refresh();
    });
  return { pending, msg, errors, run, setMsg };
}

export function Msg({ msg }: { msg: { tone: "success" | "error"; text: string } | null }) {
  return msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null;
}

const NEXT_LABEL: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  NEW: { to: "CONFIRMED", label: "Accept order" },
  CONFIRMED: { to: "PREPARING", label: "Start preparing" },
  PREPARING: { to: "READY", label: "Mark ready" },
  READY: { to: "COLLECTED", label: "Mark collected" },
};

/** One-tap "next step" button on board cards */
export function NextStepButton({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { pending, msg, run } = useAction();
  const next = NEXT_LABEL[status];
  if (!next) return null;
  return (
    <div>
      <button type="button" disabled={pending} onClick={() => run(() => transitionAction(orderId, next.to, null))} className="w-full rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-gold-ink hover:bg-gold-bright disabled:opacity-50">
        {pending ? "Saving…" : next.label}
      </button>
      {msg?.tone === "error" ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}

/** Order detail: workflow, cancel, attention, reconcile */
export function OrderControls({ orderId, status, allowed, canCancel, canReconcile, attention, hasOpenPayment }: { orderId: string; status: OrderStatus; allowed: OrderStatus[]; canCancel: boolean; canReconcile: boolean; attention: string | null; hasOpenPayment: boolean }) {
  const { pending, msg, run } = useAction();
  const [reason, setReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const workflow = allowed.filter((s) => s !== "CANCELLED" && s !== "REFUNDED" && ["CONFIRMED", "PREPARING", "READY", "COLLECTED"].includes(s));
  return (
    <div className="space-y-4">
      <Msg msg={msg} />
      {attention ? (
        <div className="rounded-xl border border-warning/50 bg-warning/10 p-4">
          <p className="font-semibold text-warning">Needs attention</p>
          <p className="mt-1 text-sm">{attention}</p>
          <button type="button" disabled={pending} onClick={() => run(() => clearAttentionAction(orderId))} className="mt-3 text-sm font-semibold text-gold underline">
            Mark as reviewed
          </button>
        </div>
      ) : null}
      {workflow.length ? (
        <div className="flex flex-wrap gap-2">
          {workflow.map((s) => (
            <Button key={s} size="sm" disabled={pending} onClick={() => run(() => transitionAction(orderId, s, null))}>
              Move to {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Status: {STATUS_LABEL[status]}. No further kitchen steps.</p>
      )}
      {canReconcile && hasOpenPayment ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reconcileAction(orderId))}>
          Check payment with provider
        </Button>
      ) : null}
      {canCancel && allowed.includes("CANCELLED") ? (
        <div className="rounded-xl border border-line p-4">
          {!confirmCancel ? (
            <button type="button" onClick={() => setConfirmCancel(true)} className="text-sm font-semibold text-danger">
              Cancel this order…
            </button>
          ) : (
            <div className="space-y-3">
              <Field id="cancel-reason" label="Reason (shown to the customer)" required>
                <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Kitchen closed due to illness" />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" disabled={pending || reason.trim().length < 3} onClick={() => run(() => transitionAction(orderId, "CANCELLED", reason), (r) => r.ok && setConfirmCancel(false))}>
                  Cancel order
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>
                  Keep order
                </Button>
              </div>
              <p className="text-xs text-muted">Cancelling doesn&apos;t refund automatically. Use the refund form for paid orders.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function RefundForm({ orderId, refundableCents, canCancel }: { orderId: string; refundableCents: number; canCancel: boolean }) {
  const { pending, msg, run } = useAction();
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [cancel, setCancel] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const key = useRef(newKey());
  if (refundableCents <= 0) return <p className="text-sm text-muted">Nothing left to refund.</p>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm) {
          setConfirm(true);
          return;
        }
        run(
          () => refundAction({ orderId, amount, reason, cancelOrder: cancel, key: key.current }),
          (r) => {
            if (r.ok) key.current = newKey();
            setConfirm(false);
          },
        );
      }}
      className="space-y-3"
    >
      <Msg msg={msg} />
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <Field id="ref-amt" label="Amount (AUD)" hint={`Up to ${formatCents(refundableCents)}`} required>
          <Input id="ref-amt" inputMode="decimal" value={amount} onChange={(e) => (setAmount(e.target.value), setConfirm(false))} />
        </Field>
        <Field id="ref-reason" label="Reason">
          <Input id="ref-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item missing" />
        </Field>
      </div>
      {canCancel ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cancel} onChange={(e) => setCancel(e.target.checked)} className="size-4 accent-[var(--gold)]" />
          Also cancel the order
        </label>
      ) : null}
      <Button type="submit" size="sm" variant={confirm ? "danger" : "outline"} disabled={pending}>
        {pending ? "Refunding…" : confirm ? `Confirm refund of $${amount}` : "Refund"}
      </Button>
    </form>
  );
}

export function StaffCreate() {
  const { pending, msg, errors, run } = useAction();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => createStaffAction({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role"), password: fd.get("password") }), (r) => r.ok && form.current?.reset());
      }}
      className="space-y-4"
    >
      <Msg msg={msg} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s-name" label="Name" error={errors.name} required>
          <Input id="s-name" name="name" error={errors.name} />
        </Field>
        <Field id="s-email" label="Email" error={errors.email} required>
          <Input id="s-email" name="email" type="email" error={errors.email} />
        </Field>
        <Field id="s-role" label="Role" required>
          <Select id="s-role" name="role" defaultValue="KITCHEN">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="s-pw" label="Temporary password" error={errors.password} hint="12+ characters. Share it privately." required>
          <Input id="s-pw" name="password" type="text" autoComplete="off" error={errors.password} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        Add staff member
      </Button>
    </form>
  );
}

export function StaffRow({ u, isMe }: { u: { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt: string | null }; isMe: boolean }) {
  const { pending, msg, run } = useAction();
  const [pw, setPw] = useState("");
  return (
    <li className="space-y-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {u.name} {isMe ? <span className="text-xs text-muted">(you)</span> : null} {!u.active ? <span className="text-xs text-danger">Deactivated</span> : null}
          </p>
          <p className="text-sm text-muted">
            {u.email} · last sign-in {u.lastLoginAt ?? "never"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={`Role for ${u.name}`} value={u.role} disabled={pending} onChange={(e) => run(() => updateStaffAction(u.id, { role: e.target.value }))} className="h-9 rounded-lg border border-line bg-sunken px-2 text-sm">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          {!isMe ? (
            <Button size="sm" variant={u.active ? "danger" : "outline"} disabled={pending} onClick={() => run(() => updateStaffAction(u.id, { active: !u.active }))}>
              {u.active ? "Deactivate" : "Reactivate"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label={`New password for ${u.name}`} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (12+ characters)" className="h-9 w-64 rounded-lg border border-line bg-sunken px-3 text-sm" />
        <Button size="sm" variant="ghost" disabled={pending || pw.length < 12} onClick={() => run(() => updateStaffAction(u.id, { password: pw }), (r) => r.ok && setPw(""))}>
          Reset password
        </Button>
      </div>
      <Msg msg={msg} />
    </li>
  );
}

export function CustomerNote({ email, initial }: { email: string; initial: string }) {
  const { pending, msg, run } = useAction();
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-3">
      <Msg msg={msg} />
      <Textarea id="cust-note" aria-label="Private notes about this customer" value={v} onChange={(e) => setV(e.target.value)} placeholder="Private notes (preferences, allergies they've told you about…)" />
      <Button size="sm" variant="outline" disabled={pending || v === initial} onClick={() => run(() => saveCustomerNoteAction(email, v))}>
        Save note
      </Button>
    </div>
  );
}

export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button size="sm" variant={handled ? "ghost" : "outline"} disabled={pending} onClick={() => run(() => setMessageHandledAction(id, !handled))}>
      {handled ? "Reopen" : "Mark handled"}
    </Button>
  );
}

export function MediaUpload() {
  const { pending, msg, run } = useAction();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => uploadMediaAction(fd), (r) => r.ok && form.current?.reset());
      }}
      className="space-y-4"
    >
      <Msg msg={msg} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="m-file" label="Photo" hint="JPEG, PNG, WebP or HEIC, up to 8 MB. Resized and optimised automatically." required>
          <input id="m-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" required className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:font-semibold file:text-gold-ink" />
        </Field>
        <Field id="m-alt" label="Describe the photo" hint="e.g. “Lamb karahi in a black handi” — read aloud by screen readers" required>
          <Input id="m-alt" name="alt" required maxLength={200} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload photo"}
      </Button>
    </form>
  );
}

export function MediaDelete({ id }: { id: string }) {
  const { pending, msg, run } = useAction();
  return (
    <div>
      <button type="button" disabled={pending} onClick={() => run(() => deleteMediaAction(id))} className="text-xs text-muted hover:text-danger">
        Delete
      </button>
      {msg?.tone === "error" ? <p className="text-xs text-danger">{msg.text}</p> : null}
    </div>
  );
}

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-xl border border-line">
      <summary className="cursor-pointer px-4 py-3 font-semibold">{title}</summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}

export function JobButtons({ id, status }: { id: string; status: string }) {
  const { pending, msg, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      {status === "FAILED" || status === "CANCELLED" ? (
        <button type="button" disabled={pending} onClick={() => run(() => retryJobAction(id))} className="text-xs font-semibold text-gold underline">
          Retry
        </button>
      ) : null}
      {status === "PENDING" ? (
        <button type="button" disabled={pending} onClick={() => run(() => cancelJobAction(id))} className="text-xs text-muted underline hover:text-danger">
          Cancel
        </button>
      ) : null}
      {msg ? <span className={`text-xs ${msg.tone === "error" ? "text-danger" : "text-success"}`}>{msg.text}</span> : null}
    </div>
  );
}

export function ResendButtons({ orderId, options }: { orderId: string; options: { template: "order_confirmed" | "order_accepted" | "order_ready" | "order_cancelled" | "order_refunded"; label: string }[] }) {
  const { pending, msg, run } = useAction();
  return (
    <div className="space-y-2">
      <Msg msg={msg} />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button key={o.template} size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resendNotificationAction(orderId, o.template))}>
            Resend: {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const { pending, msg, run } = useAction();
  const [to, setTo] = useState(defaultTo);
  return (
    <div className="space-y-2">
      <Msg msg={msg} />
      <div className="flex flex-wrap gap-2">
        <input aria-label="Send a test email to" type="email" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-full sm:w-72 rounded-lg border border-line bg-sunken px-3" placeholder="you@example.com" />
        <Button variant="outline" disabled={pending || !to} onClick={() => run(() => sendTestEmailAction(to))}>
          Send test email
        </Button>
      </div>
    </div>
  );
}
