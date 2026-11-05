/** Simplified line-art of the DSK handi (pot) emblem, for small UI and placeholders */
export function HandiIcon({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path d="M30 6c-3 3 3 5 0 8M36 6c-3 3 3 5 0 8" strokeLinecap="round" opacity=".6" />
      <circle cx="32" cy="19" r="2.5" />
      <path d="M18 27c2-5 8-7 14-7s12 2 14 7" />
      <path d="M14 28h36" strokeLinecap="round" />
      <path d="M16 31c-1 10 6 19 16 19s17-9 16-19" />
      <path d="M20 37h24M19 42h26" opacity=".5" />
      <path d="M24 50l-2 5h20l-2-5" />
    </svg>
  );
}

/** Cusped Mughal arch outline */
export function ArchOutline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 260" fill="none" className={className} aria-hidden preserveAspectRatio="none">
      <path
        d="M6 258V96C6 60 40 40 64 30c16-7 26-12 36-26 10 14 20 19 36 26 24 10 58 30 58 66v162"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
