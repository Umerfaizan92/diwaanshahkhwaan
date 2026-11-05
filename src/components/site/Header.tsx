"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { buttonClass } from "@/components/ui/Button";
import { CartButton } from "@/components/shop/CartButton";

export const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/specials", label: "Specials" },
  { href: "/weekly-menu", label: "Weekly menu" },
  { href: "/order-ahead", label: "How ordering works" },
  { href: "/about", label: "Our kitchen" },
  { href: "/contact", label: "Contact" },
];

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}

export function Header() {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 40, () => false);
  // The drawer remembers which page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    setOpenOn(next ? pathname : null);
  };
  const reduce = useReducedMotion();
  const menuBtn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const solid = !overlay || scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter] duration-300 ${
        solid ? "border-b border-line/70 bg-bg/85 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-ink">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Diwaan Shah Khwaan home">
          <Image src="/images/brand/emblem.png" alt="" width={40} height={40} className="size-9 rounded-full ring-1 ring-gold/40 lg:size-10" priority />
          <span className="whitespace-nowrap font-display text-[0.98rem] leading-none tracking-wide sm:text-lg">
            <span className="gold-leaf font-bold">Diwaan</span>{" "}
            <span className={solid ? "text-text" : "text-[#f2e8d5]"}>Shah Khwaan</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-2 text-[0.92rem] font-medium transition-colors ${
                      active ? "text-gold" : solid ? "text-text/85 hover:text-text" : "text-[#f2e8d5]/85 hover:text-[#f2e8d5]"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <ThemeToggle className={solid ? "" : "text-[#f2e8d5]/85"} />
          <CartButton tone={solid ? "solid" : "overlay"} />
          <span className="hidden sm:block">
            <Link href="/menu" className={buttonClass("gold", "sm")}>
              Order now
            </Link>
          </span>
          <button
            ref={menuBtn}
            type="button"
            className={`grid size-10 place-items-center rounded-full lg:hidden ${solid ? "text-text" : "text-[#f2e8d5]"}`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-bg px-4 pb-10 pt-4 lg:hidden"
          >
            <ul className="flex flex-col">
              {NAV.map((l, i) => (
                <li key={l.href}>
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="flex items-center justify-between border-b border-line/60 py-4 font-display text-xl"
                  >
                    {l.label}
                    <span aria-hidden className="text-gold">›</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/menu" className={buttonClass("gold", "lg", "mt-8 w-full")}>
              Order now
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
