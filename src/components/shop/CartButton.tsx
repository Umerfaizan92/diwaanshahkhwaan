"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCart } from "@/lib/client/cart-store";
import { formatCents } from "@/lib/domain/money";

function BagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" />
    </svg>
  );
}

/** Header cart link with a live item count */
export function CartButton({ tone = "solid" }: { tone?: "solid" | "overlay" }) {
  const items = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <Link
      href="/cart"
      aria-label={count ? `Your order, ${count} item${count === 1 ? "" : "s"}` : "Your order (empty)"}
      className={`relative grid size-10 place-items-center rounded-full hover:bg-text/5 ${tone === "overlay" ? "text-[#f2e8d5]" : "text-text"}`}
    >
      <BagIcon className="size-5.5" />
      {count > 0 ? (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.7rem] font-bold leading-5 text-gold-ink">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** Floating "view order" pill, shown on browse pages once something is in the cart */
export function FloatingCart() {
  const items = useCart();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.unitPriceHintCents, 0);
  const hidden = pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/order") || pathname.startsWith("/pay");
  return (
    <AnimatePresence>
      {count > 0 && !hidden && (
        <motion.div
          initial={reduce ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="no-print fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 sm:left-auto sm:right-6 sm:w-auto"
        >
          <Link
            href="/cart"
            className="flex items-center gap-3 rounded-full bg-gold py-2.5 pl-3 pr-5 text-gold-ink shadow-[var(--shadow)] ring-1 ring-black/10 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-9 place-items-center rounded-full bg-gold-ink/15">
              <BagIcon className="size-5" />
            </span>
            <span className="font-semibold">
              View order · {count} item{count === 1 ? "" : "s"}
            </span>
            <span className="ml-auto font-semibold tabular-nums sm:ml-3">{formatCents(total)}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
