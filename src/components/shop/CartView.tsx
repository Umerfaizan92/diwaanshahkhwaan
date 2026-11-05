"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cart, useCart, type CartItem } from "@/lib/client/cart-store";
import { formatCents } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { buttonClass } from "@/components/ui/Button";
import { HandiIcon } from "@/components/site/Emblem";
import { QuantityStepper } from "./QuantityStepper";

/** Fetches the authoritative server quote for the current cart contents */
export function useServerQuote(items: CartItem[]) {
  const [state, setState] = useState<{ sig: string; quote: Quote | null; failed: boolean }>({ sig: "", quote: null, failed: false });
  const sig = JSON.stringify(items.map((i) => [i.menuItemId, i.quantity, i.choiceIds]));
  useEffect(() => {
    if (!items.length) return;
    const ctrl = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, choiceIds: i.choiceIds })) }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((quote: Quote) => setState({ sig, quote, failed: false }))
      .catch((e) => {
        if (e.name !== "AbortError") setState({ sig, quote: null, failed: true });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const fresh = state.sig === sig;
  return { quote: fresh ? state.quote : null, loading: items.length > 0 && !fresh, failed: fresh && state.failed };
}

export function CartView({ acceptingOrders }: { acceptingOrders: boolean }) {
  const items = useCart();
  const reduce = useReducedMotion();
  const { quote, loading, failed } = useServerQuote(items);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <HandiIcon className="size-16 text-gold/70" />
        <h2 className="mt-4 font-display text-2xl">Your order is empty</h2>
        <p className="mt-2 max-w-sm text-muted">Add a few dishes from the menu and they&apos;ll appear here.</p>
        <Link href="/menu" className={buttonClass("gold", "lg", "mt-8")}>
          Browse the menu
        </Link>
      </div>
    );
  }

  const priced = new Map(quote?.lines.map((l) => [l.key, l]));
  const errorFor = new Map(quote?.errors.map((e) => [e.key, e.message]));
  const cartErrors = quote?.errors.filter((e) => e.key === "_cart") ?? [];
  const canCheckout = acceptingOrders && !!quote && quote.errors.length === 0 && quote.lines.length > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <section aria-labelledby="items-h" className="min-w-0">
        <h2 id="items-h" className="sr-only">
          Items
        </h2>
        <ul className="divide-y divide-line/70 border-y border-line/70">
          <AnimatePresence initial={false}>
            {items.map((i) => {
              const p = priced.get(i.key);
              const err = errorFor.get(i.key);
              return (
                <motion.li
                  key={i.key}
                  layout={!reduce}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-4 py-5"
                >
                  <Link href={`/menu/${i.slug}`} className="arch relative size-20 shrink-0 overflow-hidden bg-sunken sm:size-24" tabIndex={-1} aria-hidden>
                    {i.image ? <Image src={i.image} alt="" fill sizes="96px" className="object-cover" /> : <HandiIcon className="absolute inset-5 text-gold/60" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/menu/${i.slug}`} className="font-display text-[1.05rem] hover:text-gold">
                          {i.name}
                        </Link>
                        {i.optionLabels.length ? <p className="text-sm text-muted">{i.optionLabels.join(" · ")}</p> : null}
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{p ? formatCents(p.lineTotalCents) : loading ? <span className="skeleton inline-block h-5 w-14" /> : "—"}</span>
                    </div>
                    {err ? (
                      <p role="alert" className="mt-2 text-sm font-medium text-danger">
                        {err}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-4">
                      <QuantityStepper size="sm" value={i.quantity} min={1} max={i.maxPerOrder} onChange={(n) => cart.setQuantity(i.key, n)} label={`Quantity of ${i.name}`} />
                      <button type="button" onClick={() => cart.remove(i.key)} className="text-sm text-muted underline-offset-4 hover:text-danger hover:underline">
                        Remove<span className="sr-only"> {i.name}</span>
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/menu" className={buttonClass("outline", "md")}>
            Add more dishes
          </Link>
          <button type="button" onClick={() => cart.clear()} className={buttonClass("ghost", "md", "text-muted")}>
            Clear order
          </button>
        </div>
      </section>

      <aside aria-labelledby="summary-h" className="h-fit rounded-3xl border border-line bg-raised p-6 lg:sticky lg:top-28">
        <h2 id="summary-h" className="font-display text-xl">
          Order summary
        </h2>
        <dl className="mt-5 space-y-2" aria-live="polite" aria-busy={loading}>
          <div className="flex justify-between">
            <dt className="text-muted">Items</dt>
            <dd className="tabular-nums">{quote ? quote.itemCount : "…"}</dd>
          </div>
          {quote && quote.totalCents > quote.subtotalCents ? (
            <>
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatCents(quote.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">GST (10%)</dt>
                <dd className="tabular-nums">{formatCents(quote.gstCents)}</dd>
              </div>
            </>
          ) : quote && quote.gstCents > 0 ? (
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Includes GST</dt>
              <dd className="tabular-nums">{formatCents(quote.gstCents)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-2xl text-gold tabular-nums">{quote ? formatCents(quote.totalCents) : <span className="skeleton inline-block h-7 w-20" />}</dd>
          </div>
        </dl>
        {cartErrors.map((e) => (
          <p key={e.message} role="alert" className="mt-3 text-sm text-danger">
            {e.message}
          </p>
        ))}
        {failed ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            We couldn&apos;t check prices just now. Check your connection and refresh the page.
          </p>
        ) : null}
        {quote && quote.errors.some((e) => e.key !== "_cart") ? <p className="mt-3 text-sm text-danger">Fix or remove the items marked above to continue.</p> : null}
        {!acceptingOrders ? <p className="mt-3 text-sm text-warning">We&apos;re not taking online orders right now. Please call us to order.</p> : null}
        {canCheckout ? (
          <Link href="/checkout" className={buttonClass("gold", "lg", "mt-6 w-full")}>
            Choose pickup time
          </Link>
        ) : (
          <button type="button" disabled className={buttonClass("gold", "lg", "mt-6 w-full")}>
            Choose pickup time
          </button>
        )}
        <p className="mt-3 text-center text-xs text-muted">Prices are checked again when you pay.</p>
      </aside>
    </div>
  );
}
