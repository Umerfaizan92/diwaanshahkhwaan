"use client";

import { useEffect, useState } from "react";

/** Phone-friendly category picker: a native dropdown that jumps to the section, and follows scrolling */
export function CategoryJump({ categories }: { categories: { slug: string; name: string }[] }) {
  const [current, setCurrent] = useState(categories[0]?.slug ?? "");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(hit.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    for (const c of categories) {
      const el = document.getElementById(c.slug);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [categories]);

  return (
    <label className="flex items-center gap-3">
      <span className="shrink-0 text-sm font-semibold text-muted">Jump to</span>
      <select
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          document.getElementById(e.target.value)?.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", `#${e.target.value}`);
        }}
        className="h-11 min-w-0 flex-1 appearance-none rounded-xl border border-gold/50 bg-raised bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22M4 6l4 4 4-4%22 stroke=%22%23c9a24a%22 stroke-width=%221.8%22 fill=%22none%22/></svg>')] bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pl-3 pr-10 font-semibold text-text"
        aria-label="Jump to a menu category"
      >
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
