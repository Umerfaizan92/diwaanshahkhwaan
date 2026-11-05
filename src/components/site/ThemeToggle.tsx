"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const isLight = () => document.documentElement.dataset.theme === "light";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const light = useSyncExternalStore(subscribe, isLight, () => false);
  function toggle() {
    const next = !light;
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("dsk-theme", next ? "light" : "dark");
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    listeners.forEach((l) => l());
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className={`grid size-10 place-items-center rounded-full text-text/80 hover:bg-text/5 hover:text-text ${className}`}
    >
      {light ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
