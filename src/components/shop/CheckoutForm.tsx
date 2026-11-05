"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { useCart } from "@/lib/client/cart-store";
import { formatCents } from "@/lib/domain/money";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { startCheckout } from "@/app/(site)/checkout/actions";
import { Alert, Field, Input, Textarea } from "@/components/ui/Field";
import { Button, buttonClass } from "@/components/ui/Button";
import { useServerQuote } from "./CartView";
import { PickupPicker } from "./PickupPicker";
import { OrderTotals } from "./OrderTotals";
import { CardMarks, CashIcon, CardIcon, LockIcon, SecurityPoints } from "./PaymentBadges";

type Prefill = { name: string; email: string; phone: string } | null;

function newKey() {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
}

export function CheckoutForm({
  prefill,
  smsAvailable,
  acceptCash = true,
  acceptCard = true,
}: {
  prefill: Prefill;
  signedIn?: boolean;
  smsAvailable: boolean;
  acceptCash?: boolean;
  acceptCard?: boolean;
}) {
  const items = useCart();
  const { quote, loading } = useServerQuote(items);
  const [pending, start] = useTransition();
  const [pickup, setPickup] = useState<{ date: string; time: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [method, setMethod] = useState<"CARD" | "CASH">(acceptCard ? "CARD" : "CASH");
  const formRef = useRef<HTMLFormElement>(null);
  // A new idempotency key whenever the order details change; the same key for retries of an identical submission
  const keyRef = useRef<{ sig: string; key: string }>({ sig: "", key: "" });
  const onPickup = useCallback((v: { date: string; time: string } | null) => setPickup(v), []);

  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted">Your order is empty.</p>
        <Link href="/menu" className={buttonClass("gold", "lg", "mt-6")}>
          Browse the menu
        </Link>
      </div>
    );
  }

  const lines = items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, choiceIds: i.choiceIds }));
  const slotLines = items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }));
  const cartBlocked = !!quote && quote.errors.length > 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      lines,
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      pickupDate: pickup?.date ?? "",
      pickupTime: pickup?.time ?? "",
      smsOptIn: fd.get("smsOptIn") === "on",
      paymentMethod: method,
      acceptTerms: (fd.get("acceptTerms") === "on") as true,
    };
    const local: Record<string, string> = {};
    if (!pickup) local.pickupTime = "Choose a pickup date and time";
    if (!input.acceptTerms) local.acceptTerms = "Please accept the terms and refund policy";
    if (Object.keys(local).length) {
      setErrors(local);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    const sig = JSON.stringify(input);
    if (keyRef.current.sig !== sig) keyRef.current = { sig, key: newKey() };
    start(async () => {
      const r = await startCheckout({ ...input, idempotencyKey: keyRef.current.key });
      if (r.ok) {
        window.location.assign(r.redirectUrl);
        return;
      }
      setErrors(r.fieldErrors ?? {});
      setFormError(r.error);
      if (r.refreshSlots) {
        setPickup(null);
        setSlotRefresh((n) => n + 1);
        keyRef.current = { sig: "", key: "" };
      }
      formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <div className="min-w-0 space-y-10">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <section aria-labelledby="pickup-h">
          <h2 id="pickup-h" className="mb-4 font-display text-2xl">
            1. Pickup time
          </h2>
          <PickupPicker lines={slotLines} value={pickup} onChange={onPickup} error={errors.pickupTime ?? errors.pickupDate} refreshKey={slotRefresh} />
        </section>

        <section aria-labelledby="details-h" className="space-y-5">
          <h2 id="details-h" className="font-display text-2xl">
            2. Your details
          </h2>
          <p className="text-sm text-muted">No account needed. Your confirmation email has a private link to track your order.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Name" error={errors.name} required>
              <Input id="name" name="name" autoComplete="name" defaultValue={prefill?.name} error={errors.name} required />
            </Field>
            <Field id="phone" label="Mobile" error={errors.phone} hint="So we can reach you about pickup" required>
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={prefill?.phone} error={errors.phone} placeholder="04xx xxx xxx" required />
            </Field>
          </div>
          <Field id="email" label="Email" error={errors.email} hint="Your receipt and updates go here" required>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={prefill?.email} error={errors.email} required />
          </Field>
          <Field id="notes" label="Notes for the kitchen" error={errors.notes} hint="Allergies: please also call us before ordering.">
            <Textarea id="notes" name="notes" className="min-h-24" maxLength={500} />
          </Field>
          {smsAvailable ? (
            <label className="flex items-start gap-3 text-[0.95rem]">
              <input type="checkbox" name="smsOptIn" defaultChecked className="mt-1 size-4 accent-[var(--gold)]" />
              Text me my order confirmation and when it&apos;s ready
            </label>
          ) : null}
          <div>
            <label className="flex items-start gap-3 text-[0.95rem]">
              <input type="checkbox" name="acceptTerms" className="mt-1 size-4 accent-[var(--gold)]" aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? "terms-err" : undefined} />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-gold underline">
                  terms
                </Link>{" "}
                and{" "}
                <Link href="/refunds" target="_blank" className="text-gold underline">
                  refund &amp; cancellation policy
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms ? (
              <p id="terms-err" className="mt-1 text-sm font-medium text-danger">
                {errors.acceptTerms}
              </p>
            ) : null}
          </div>
        </section>

        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 font-display text-2xl">
            3. Payment
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 font-sans text-xs font-semibold text-success">
              <LockIcon className="size-4" /> Secure checkout
            </span>
          </legend>
          {errors.paymentMethod ? <p className="text-sm font-medium text-danger">{errors.paymentMethod}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {acceptCard ? (
              <label className={`relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${method === "CARD" ? "border-gold bg-gold/10" : "border-line bg-raised hover:border-gold/60"}`}>
                <span className="flex items-start gap-3">
                  <input type="radio" name="paymentMethod" value="CARD" checked={method === "CARD"} onChange={() => setMethod("CARD")} className="mt-1 size-4 accent-[var(--gold)]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      <CardIcon className="size-5 text-gold" /> Pay by card now
                    </span>
                    <span className="mt-1 block text-sm text-muted">Debit or credit card, Apple Pay or Google Pay on Stripe&apos;s encrypted checkout.</span>
                  </span>
                </span>
                <CardMarks className="pl-7" />
              </label>
            ) : null}
            {acceptCash ? (
              <label className={`relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${method === "CASH" ? "border-gold bg-gold/10" : "border-line bg-raised hover:border-gold/60"}`}>
                <span className="flex items-start gap-3">
                  <input type="radio" name="paymentMethod" value="CASH" checked={method === "CASH"} onChange={() => setMethod("CASH")} className="mt-1 size-4 accent-[var(--gold)]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      <CashIcon className="size-5 text-gold" /> Cash at pickup
                    </span>
                    <span className="mt-1 block text-sm text-muted">Your order is booked straight away. Please bring the exact amount if you can.</span>
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          {method === "CARD" ? <SecurityPoints /> : null}
        </fieldset>
      </div>

      <aside aria-labelledby="sum-h" className="h-fit min-w-0 rounded-3xl border border-line bg-raised p-6 lg:sticky lg:top-28">
        <h2 id="sum-h" className="font-display text-xl">
          4. Review &amp; {method === "CASH" ? "place order" : "pay"}
        </h2>
        <ul className="mt-4 space-y-2 text-[0.95rem]">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span>
                {l.quantity} × {l.name}
                {l.options.length ? <span className="block text-xs text-muted">{l.options.map((o) => o.choice).join(" · ")}</span> : null}
              </span>
              <span className="tabular-nums">{formatCents(l.lineTotalCents)}</span>
            </li>
          ))}
          {loading ? <li className="skeleton h-5 w-full" /> : null}
        </ul>
        {quote?.errors.map((e) => (
          <p key={e.key + e.message} role="alert" className="mt-2 text-sm text-danger">
            {e.message}{" "}
            <Link href="/cart" className="underline">
              Edit order
            </Link>
          </p>
        ))}
        <div className="mt-4 border-t border-line pt-3">
          {pickup ? (
            <p className="text-sm">
              Pickup <strong>{formatDateLong(pickup.date)}</strong> at <strong>{formatTime12(pickup.time)}</strong>
            </p>
          ) : (
            <p className="text-sm text-muted">Choose a pickup time</p>
          )}
          {quote ? (
            <OrderTotals className="mt-3" subtotalCents={quote.subtotalCents} gstCents={quote.gstCents} totalCents={quote.totalCents} />
          ) : (
            <p className="mt-2 flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl text-gold">…</span>
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !quote || cartBlocked}>
          {method === "CASH" ? (pending ? "Placing your order…" : `Place order · pay ${quote ? formatCents(quote.totalCents) : ""} at pickup`) : pending ? "Holding your time…" : `Pay ${quote ? formatCents(quote.totalCents) : ""} securely`}
        </Button>
        {method === "CASH" ? (
          <p className="mt-3 text-center text-xs text-muted">You&apos;ll get a confirmation and receipt by email straight away.</p>
        ) : (
          <div className="mt-3 space-y-2 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <LockIcon className="size-4 text-success" /> Encrypted payment powered by Stripe
            </p>
            <CardMarks className="justify-center" />
          </div>
        )}
        <Link href="/cart" className="mt-3 block text-center text-sm text-muted underline">
          Edit order
        </Link>
      </aside>
    </form>
  );
}
