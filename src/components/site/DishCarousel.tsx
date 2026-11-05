"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Auto-advancing, swipeable dish carousel.
 * - Scroll-snap track, so touch swipe and keyboard scrolling work natively
 * - Pauses on hover, focus, touch and when off-screen; never auto-plays with reduced motion
 * - Visible pause/play control (WCAG 2.2.2) and previous/next buttons
 */
export function DishCarousel({ children, label, interval = 2500 }: { children: ReactNode[]; label: string; interval?: number }) {
  const track = useRef<HTMLUListElement>(null);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const w = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * w, behavior: "smooth" });
  }, []);

  const auto = playing && !hold && visible && !reduced;
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => step(1), interval);
    return () => window.clearInterval(t);
  }, [auto, interval, step]);

  const btn =
    "grid size-11 place-items-center rounded-full border border-gold/50 bg-raised text-text transition-colors hover:border-gold hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={() => setHold(false)}
      onTouchStart={() => setHold(true)}
      onTouchEnd={() => window.setTimeout(() => setHold(false), 5000)}
    >
      <ul
        ref={track}
        className="rail -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:px-0"
        aria-live={auto ? "off" : "polite"}
      >
        {children.map((c, i) => (
          <li key={i} className="w-[78%] shrink-0 snap-start min-[480px]:w-[60%] sm:w-[44%] md:w-[31%] lg:w-[23.5%]" aria-roledescription="slide" aria-label={`${i + 1} of ${children.length}`}>
            {c}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-end gap-2">
        {!reduced ? (
          <button type="button" className={btn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause carousel" : "Play carousel"}>
            {playing ? (
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d="M5 3l8 5-8 5z" fill="currentColor" /></svg>
            )}
          </button>
        ) : null}
        <button type="button" className={btn} onClick={() => step(-1)} aria-label="Previous dishes">
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
        </button>
        <button type="button" className={btn} onClick={() => step(1)} aria-label="Next dishes">
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
        </button>
      </div>
    </div>
  );
}
