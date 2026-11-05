"use client";

import Link from "next/link";
import { cardImage } from "@/lib/domain/images";
import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cart } from "@/lib/client/cart-store";
import { formatCents } from "@/lib/domain/money";
import type { PublicDish } from "@/lib/server/menu";
import { buttonClass } from "@/components/ui/Button";
import { QuantityStepper } from "./QuantityStepper";

/** Option picker, quantity and add-to-order for a dish. Prices shown are a preview; the server re-prices at checkout. */
export function AddToCart({ dish, acceptingOrders }: { dish: PublicDish; acceptingOrders: boolean }) {
  const uid = useId();
  const reduce = useReducedMotion();
  const initial = useMemo(() => {
    const sel: Record<string, string[]> = {};
    for (const g of dish.optionGroups) {
      const def = g.choices.find((c) => c.isDefault && c.isAvailable) ?? (g.required ? g.choices.find((c) => c.isAvailable) : undefined);
      sel[g.id] = def ? [def.id] : [];
    }
    return sel;
  }, [dish.optionGroups]);
  const [selected, setSelected] = useState<Record<string, string[]>>(initial);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ qty: number; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = dish.optionGroups.flatMap((g) => g.choices.filter((c) => selected[g.id]?.includes(c.id)).map((c) => ({ g, c })));
  const unit = dish.priceCents + chosen.reduce((s, x) => s + x.c.priceDeltaCents, 0);

  if (!dish.isAvailable) {
    return <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">This dish is sold out right now. Check back soon or see the rest of the menu.</p>;
  }
  if (!acceptingOrders) {
    return <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">We&apos;re not taking online orders at the moment. Please call us to order.</p>;
  }

  function toggle(groupId: string, choiceId: string, max: number) {
    setError(null);
    setSelected((s) => {
      const cur = s[groupId] ?? [];
      if (max === 1) return { ...s, [groupId]: [choiceId] };
      if (cur.includes(choiceId)) return { ...s, [groupId]: cur.filter((x) => x !== choiceId) };
      if (cur.length >= max) return s;
      return { ...s, [groupId]: [...cur, choiceId] };
    });
  }

  function add() {
    for (const g of dish.optionGroups) {
      const n = selected[g.id]?.length ?? 0;
      if (n < Math.max(g.minSelect, g.required ? 1 : 0)) {
        setError(`Choose ${g.name.toLowerCase()}.`);
        return;
      }
    }
    cart.add({
      menuItemId: dish.id,
      slug: dish.slug,
      name: dish.name,
      image: cardImage(dish.image),
      quantity: qty,
      choiceIds: chosen.map((x) => x.c.id),
      optionLabels: chosen.map((x) => (x.c.priceDeltaCents ? `${x.c.name} (+${formatCents(x.c.priceDeltaCents)})` : x.c.name)),
      unitPriceHintCents: unit,
      maxPerOrder: dish.maxPerOrder,
    });
    setAdded({ qty, at: Date.now() });
    setQty(1);
  }

  return (
    <div className="space-y-6">
      {dish.optionGroups.map((g) => {
        const single = g.maxSelect === 1;
        const legendId = `${uid}-${g.id}`;
        return (
          <fieldset key={g.id} aria-describedby={`${legendId}-hint`}>
            <legend className="font-semibold">
              {g.name}
              {g.required ? <span className="sr-only"> (required)</span> : null}
            </legend>
            <p id={`${legendId}-hint`} className="text-sm text-muted">
              {g.required ? (single ? "Choose one" : `Choose ${g.minSelect || 1}–${g.maxSelect}`) : single ? "Optional" : `Optional, up to ${g.maxSelect}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.choices.map((c) => {
                const on = selected[g.id]?.includes(c.id) ?? false;
                return (
                  <label
                    key={c.id}
                    className={`relative flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[0.95rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                      on ? "border-gold bg-gold/15 text-text" : "border-line text-text/85 hover:border-gold/60"
                    } ${c.isAvailable ? "" : "cursor-not-allowed opacity-45"}`}
                  >
                    <input
                      type={single ? "radio" : "checkbox"}
                      name={`${uid}-${g.id}`}
                      value={c.id}
                      checked={on}
                      disabled={!c.isAvailable}
                      onChange={() => toggle(g.id, c.id, g.maxSelect)}
                      className="sr-only"
                    />
                    {c.name}
                    {c.priceDeltaCents ? <span className="text-sm text-muted">+{formatCents(c.priceDeltaCents)}</span> : null}
                    {!c.isAvailable ? <span className="text-xs">(unavailable)</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} min={1} max={dish.maxPerOrder} onChange={setQty} label={`Quantity of ${dish.name}`} />
        <button type="button" onClick={add} className={buttonClass("gold", "lg", "min-w-56 flex-1 sm:flex-none")}>
          Add to order · {formatCents(unit * qty)}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div aria-live="polite" className="min-h-6">
        <AnimatePresence>
          {added !== null && (
            <motion.p
              key={added.at}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-success"
            >
              <span>
                Added {added.qty} × {dish.name} to your order.
              </span>
              <Link href="/cart" className="font-semibold text-gold underline">
                View order
              </Link>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
