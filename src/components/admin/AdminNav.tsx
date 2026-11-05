"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavItem = { href: string; label: string; badge?: number };

export function AdminNav({ items, user, logout }: { items: NavItem[]; user: { name: string; role: string }; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const list = (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-[0.93rem] ${isActive(i.href) ? "bg-gold/15 font-semibold text-gold" : "text-text/80 hover:bg-text/5 hover:text-text"}`}
          >
            {i.label}
            {i.badge ? <span className="rounded-full bg-maroon px-2 text-xs font-bold leading-5 text-[#f6e7cf]">{i.badge}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-lg">
          <span className="gold-leaf font-bold">DSK</span> Owner
        </Link>
        <button type="button" aria-expanded={open} aria-controls="admin-nav-mobile" onClick={() => setOpenOn(open ? null : pathname)} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-text/5">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <nav id="admin-nav-mobile" aria-label="Dashboard" className="no-print border-b border-line bg-raised px-3 py-3 lg:hidden">
          {list}
          <form action={logout} className="mt-3 border-t border-line pt-3">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:text-danger">Sign out ({user.name})</button>
          </form>
        </nav>
      ) : null}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-sunken px-3 py-5 lg:flex">
        <Link href="/admin" className="mb-6 px-3 font-display text-xl">
          <span className="gold-leaf font-bold">DSK</span> Owner
        </Link>
        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto">
          {list}
        </nav>
        <div className="mt-4 border-t border-line px-3 pt-4 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-muted">{user.role}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="text-muted hover:text-gold">
              View site
            </Link>
            <form action={logout}>
              <button className="text-muted hover:text-danger">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
