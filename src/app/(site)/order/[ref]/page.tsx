import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/PageHeader";
import { PaymentPending } from "@/components/shop/PaymentPending";
import { ClearCartOnPaid } from "@/components/shop/ClearCartOnPaid";
import { buttonClass } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Field";
import { loadOrderForViewer } from "@/lib/server/order-access";
import { getSettings } from "@/lib/server/settings";
import { formatCents } from "@/lib/domain/money";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { CUSTOMER_STEPS, STATUS_LABEL } from "@/lib/domain/order-status";
import { toTelHref } from "@/lib/config/business";
import { cancelCheckout, resumePayment } from "./actions";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[ref]">) {
  const { ref } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : undefined;
  const [order, settings] = await Promise.all([loadOrderForViewer(ref, token), getSettings()]);
  if (!order) notFound();

  const paid = !!order.paidAt;
  const awaiting = order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED";
  const holdValid = !!order.holdExpiresAt && order.holdExpiresAt > new Date();
  const stepIndex = CUSTOMER_STEPS.findIndex((s) => s.status === order.status);
  const phone = settings.contacts[0]?.phone;
  const t = order.trackingToken;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <Container className="max-w-3xl pb-10 pt-24 lg:pt-32">
      {paid && sp.from === "payment" ? <ClearCartOnPaid reference={order.reference} /> : null}
      <p className="text-sm text-muted">Order {order.reference}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
        {paid && order.status === "NEW" ? "Thank you — your order is in" : awaiting ? "Finish paying to confirm" : STATUS_LABEL[order.status]}
      </h1>

      <div className="mt-6 space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {awaiting && sp.from === "payment" ? <PaymentPending reference={order.reference} token={t} /> : null}
        {order.status === "PAYMENT_FAILED" ? <Alert tone="error">Your payment didn&apos;t go through. No money was taken. You can try again while your pickup time is held.</Alert> : null}
        {awaiting && holdValid ? (
          <div className="rounded-2xl border border-line bg-raised p-5">
            <p>
              Your pickup time is held until{" "}
              <strong>{new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", timeZone: settings.timezone }).format(order.holdExpiresAt!)}</strong>. Your order isn&apos;t confirmed until payment is complete.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={resumePayment.bind(null, order.reference, t)}>
                <button className={buttonClass("gold", "md")}>Complete payment</button>
              </form>
              <form action={cancelCheckout.bind(null, order.reference, t)}>
                <button className={buttonClass("ghost", "md")}>Cancel this order</button>
              </form>
            </div>
          </div>
        ) : null}
        {awaiting && !holdValid ? (
          <Alert tone="warning">
            The pickup time we held for this order has been released because payment wasn&apos;t completed.{" "}
            <Link href="/cart" className="underline">
              Start again from your order
            </Link>
            .
          </Alert>
        ) : null}
        {order.status === "EXPIRED" ? <Alert tone="warning">This order expired before payment was completed, so nothing was charged.</Alert> : null}
        {order.status === "CANCELLED" ? <Alert tone="warning">This order has been cancelled.{order.refundedCents ? ` ${formatCents(order.refundedCents)} has been refunded to your card.` : ""}</Alert> : null}
        {order.status === "REFUNDED" ? <Alert tone="info">{formatCents(order.refundedCents)} has been refunded to your card. Banks usually take 5–10 business days to show it.</Alert> : null}
      </div>

      {paid && stepIndex >= 0 ? (
        <ol className="mt-8 grid gap-2 sm:grid-cols-5" aria-label="Order progress">
          {CUSTOMER_STEPS.map((s, i) => {
            const done = i <= stepIndex;
            return (
              <li key={s.status} aria-current={i === stepIndex ? "step" : undefined} className={`rounded-xl border px-3 py-2.5 text-sm ${i === stepIndex ? "border-gold bg-gold/15 font-semibold" : done ? "border-gold/40 text-text/80" : "border-line text-muted"}`}>
                <span aria-hidden className="mr-1.5">{done ? "✓" : "○"}</span>
                {s.label}
              </li>
            );
          })}
        </ol>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Pickup details">
        <div className="rounded-2xl border border-line bg-raised p-5">
          <h2 className="font-display text-lg text-gold">Pickup</h2>
          <p className="mt-2 text-lg">{formatDateLong(order.pickupDate)}</p>
          <p className="text-lg">{formatTime12(order.pickupTime)}</p>
          {paid ? (
            settings.pickupAddress ? (
              <p className="mt-3 whitespace-pre-line">{settings.pickupAddress}</p>
            ) : (
              <p className="mt-3 text-muted">{settings.pickupArea}. We&apos;ll confirm the exact address with you by phone or text before pickup.</p>
            )
          ) : (
            <p className="mt-3 text-muted">{settings.pickupArea}. The exact address appears here once your order is paid.</p>
          )}
          {paid && settings.pickupInstructions ? <p className="mt-2 text-sm text-muted">{settings.pickupInstructions}</p> : null}
        </div>
        <div className="rounded-2xl border border-line bg-raised p-5">
          <h2 className="font-display text-lg text-gold">Your details</h2>
          <p className="mt-2">{order.customerName}</p>
          <p className="text-muted">{order.customerPhone}</p>
          <p className="break-all text-muted">{order.customerEmail}</p>
          {order.notes ? <p className="mt-2 text-sm">Note: {order.notes}</p> : null}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="items-h">
        <h2 id="items-h" className="font-display text-xl">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-line/70 border-y border-line/70">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>
                {i.quantity} × {i.name}
                {i.options.length ? <span className="block text-sm text-muted">{i.options.map((o) => o.choice).join(" · ")}</span> : null}
              </span>
              <span className="tabular-nums">{formatCents(i.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1">
          {order.gstCents > 0 ? (
            <div className="flex justify-between text-sm text-muted">
              <dt>Includes GST</dt>
              <dd className="tabular-nums">{formatCents(order.gstCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-lg font-semibold">
            <dt>Total{paid ? " paid" : ""}</dt>
            <dd className="tabular-nums text-gold">{formatCents(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {paid ? (
          <Link href={`/order/${order.reference}/receipt?t=${t}`} className={buttonClass("outline", "md")}>
            View receipt
          </Link>
        ) : null}
        <Link href="/menu" className={buttonClass("ghost", "md")}>
          Back to the menu
        </Link>
      </div>
      {paid ? (
        <p className="mt-8 text-sm text-muted">
          Need to change or cancel? {phone ? <a href={toTelHref(phone)} className="text-gold underline">Call {phone}</a> : "Contact us"} at least {settings.cancelDeadlineHours} hours before pickup. Keep this page&apos;s link — it&apos;s how you can check your order.
        </p>
      ) : null}
    </Container>
  );
}
