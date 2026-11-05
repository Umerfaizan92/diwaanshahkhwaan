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

type Prefill = { name: string; email: string; phone: string } | null;

function newKey() {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
}

export function CheckoutForm({ prefill, signedIn, smsAvailable }: { prefill: Prefill; signedIn: boolean; smsAvailable: boolean }) {
  const items = useCart();
  const { quote, loading } = useServerQuote(items);
  const [pending, start] = useTransition();
  const [pickup, setPickup] = useState<{ date: string; time: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
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
          {!signedIn ? (
            <p className="text-sm text-muted">
              Checking out as a guest.{" "}
              <Link href="/account?next=/checkout" className="text-gold underline">
                Sign in
              </Link>{" "}
              to keep your order history.
            </p>
          ) : null}
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
              <input type="checkbox" name="smsOptIn" className="mt-1 size-4 accent-[var(--gold)]" />
              Text me when my order is ready
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
      </div>

      <aside aria-labelledby="sum-h" className="h-fit min-w-0 rounded-3xl border border-line bg-raised p-6 lg:sticky lg:top-28">
        <h2 id="sum-h" className="font-display text-xl">
          3. Review &amp; pay
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
          {quote && quote.gstCents > 0 ? <p className="mt-2 flex justify-between text-sm text-muted"><span>Includes GST</span><span>{formatCents(quote.gstCents)}</span></p> : null}
          <p className="mt-2 flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-display text-2xl text-gold tabular-nums">{quote ? formatCents(quote.totalCents) : "…"}</span>
          </p>
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !quote || cartBlocked}>
          {pending ? "Holding your time…" : `Pay ${quote ? formatCents(quote.totalCents) : ""}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted">You&apos;ll pay on our payment provider&apos;s secure page. We never see your card details.</p>
        <Link href="/cart" className="mt-3 block text-center text-sm text-muted underline">
          Edit order
        </Link>
      </aside>
    </form>
  );
}
