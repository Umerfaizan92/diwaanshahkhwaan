"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type RotatorDish = { slug: string; name: string; src: string };

/** Fast-changing framed dish card for the hero (2s per dish). Pauses on hover/focus and for reduced motion. */
export function HeroDishRotator({ dishes, className = "", interval = 2000 }: { dishes: RotatorDish[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || dishes.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % dishes.length), interval);
    return () => window.clearInterval(t);
  }, [hold, dishes.length, interval]);

  if (!dishes.length) return null;
  const d = dishes[i];
  return (
    <Link
      href={`/menu/${d.slug}`}
      aria-label={`See ${d.name}`}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      className={`group relative block overflow-hidden rounded-[1.6rem] border-2 border-[#d9b45a] bg-[#120c08] p-1.5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8),0_0_40px_-8px_rgb(226_189_94/0.45)] ${className}`}
    >
      <span className="relative block aspect-[2/1] overflow-hidden rounded-[1.25rem]">
        {dishes.map((x, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={x.slug}
            src={x.src}
            alt={n === i ? x.name : ""}
            aria-hidden={n === i ? undefined : true}
            loading={n < 3 ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out ${n === i ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
          />
        ))}
      </span>
      <span className="mt-1.5 flex justify-center gap-1" aria-hidden>
        {dishes.map((x, n) => (
          <span key={x.slug} className={`h-1 rounded-full transition-all duration-300 ${n === i ? "w-4 bg-[#f0d07a]" : "w-1 bg-[#f0d07a]/35"}`} />
        ))}
      </span>
    </Link>
  );
}
