"use client";

import { useEffect } from "react";

/** Tiny parallax driver: sets a CSS variable on scroll (skipped when reduced motion is on) */
export function HeroParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        document.documentElement.style.setProperty("--parallax", `${Math.round(y * 0.18)}px`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--parallax");
    };
  }, []);
  return null;
}
