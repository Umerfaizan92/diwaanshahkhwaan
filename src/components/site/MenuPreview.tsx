"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { formatCentsShort } from "@/lib/domain/money";

type Item = { slug: string; name: string; shortDescription: string; priceCents: number; isAvailable: boolean; portion: string | null };
type Cat = { slug: string; name: string; description: string | null; items: Item[] };

/** Tabbed category preview with animated transitions; a WAI-ARIA tabs pattern */
export function MenuPreview({ categories }: { categories: Cat[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cat = categories[active];
  if (!cat) return null;

  function onKey(e: KeyboardEvent) {
    const n = categories.length;
    let next = active;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (active + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (active - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-12">
      <div role="tablist" aria-label="Menu categories" onKeyDown={onKey} className="rail -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {categories.map((c, i) => (
          <button
            key={c.slug}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`relative shrink-0 rounded-full px-4 py-2 text-left text-[0.95rem] transition-colors lg:rounded-xl lg:py-3 ${
              i === active ? "bg-gold text-gold-ink lg:bg-raised lg:text-gold" : "border border-line text-text/80 hover:text-text lg:border-transparent"
            }`}
          >
            {i === active && <span aria-hidden className="absolute inset-y-2 left-0 hidden w-0.5 rounded bg-gold lg:block" />}
            {c.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} className="min-h-[22rem]">
        <div key={cat.slug} className="slide-in">
            {cat.description ? <p className="mb-5 max-w-prose text-muted">{cat.description}</p> : null}
            <ul className="divide-y divide-line/70 border-y border-line/70">
              {cat.items.map((d) => (
                <li key={d.slug}>
                  <Link href={`/menu/${d.slug}`} className="group flex items-baseline gap-3 py-4">
                    <span className="min-w-0">
                      <span className="font-display text-[1.05rem] group-hover:text-gold">{d.name}</span>
                      {d.portion ? <span className="ml-2 text-sm text-muted">{d.portion}</span> : null}
                      {!d.isAvailable ? <span className="ml-2 text-xs font-semibold text-danger">Sold out</span> : null}
                      <span className="block text-sm text-muted">{d.shortDescription}</span>
                    </span>
                    <span aria-hidden className="mx-1 hidden flex-1 border-b border-dotted border-line sm:block" />
                    <span className="ml-auto shrink-0 font-display text-gold">{formatCentsShort(d.priceCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
        </div>
      </div>
    </div>
  );
}
