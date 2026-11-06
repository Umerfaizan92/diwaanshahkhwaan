import { useId } from "react";

/**
 * Royal "Halal Certified" seal: a scalloped gold medallion with a maroon centre, the Arabic
 * حلال and HALAL CERTIFIED set around the ring. Pure SVG, so it is crisp at any size and costs
 * no download. Only rendered when the owner has switched certification on in Settings.
 */
export function HalalSeal({ className = "size-24", title = "Halal Certified" }: { className?: string; title?: string }) {
  // Unique ids per seal: gradients inside a hidden copy (e.g. the desktop-only seal on a phone) must not be shared
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gold = `hs-gold-${u}`;
  const maroon = `hs-maroon-${u}`;
  const top = `hs-top-${u}`;
  const bottom = `hs-bottom-${u}`;
  // 24 scallops around the rim
  const scallops = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return { x: 100 + Math.cos(a) * 88, y: 100 + Math.sin(a) * 88 };
  });
  return (
    <svg viewBox="0 0 200 200" className={className} role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbe7a6" />
          <stop offset="0.35" stopColor="#e2bd5e" />
          <stop offset="0.65" stopColor="#b8862f" />
          <stop offset="1" stopColor="#f3d68a" />
        </linearGradient>
        <radialGradient id={maroon} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#8a2230" />
          <stop offset="1" stopColor="#4a0f18" />
        </radialGradient>
        <path id={top} d="M 38 100 A 62 62 0 0 1 162 100" />
        <path id={bottom} d="M 30 100 A 70 70 0 0 0 170 100" />
      </defs>
      {/* Scalloped gold rim */}
      {scallops.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="11" fill={`url(#${gold})`} />
      ))}
      <circle cx="100" cy="100" r="88" fill={`url(#${gold})`} />
      <circle cx="100" cy="100" r="80" fill={`url(#${maroon})`} />
      <circle cx="100" cy="100" r="76" fill="none" stroke={`url(#${gold})`} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="50" fill="none" stroke={`url(#${gold})`} strokeWidth="1.5" />
      {/* Ring lettering */}
      <text fill="#f6e3a8" fontFamily="var(--font-cinzel), Georgia, serif" fontSize="15" fontWeight="700" letterSpacing="3.5">
        <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
          HALAL
        </textPath>
      </text>
      <text fill="#f6e3a8" fontFamily="var(--font-cinzel), Georgia, serif" fontSize="13" fontWeight="700" letterSpacing="3">
        <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
          CERTIFIED
        </textPath>
      </text>
      {/* Stars between the words */}
      <path d="M26 100l3-2 3 2-3 2z M168 100l3-2 3 2-3 2z" fill="#f6e3a8" />
      {/* Crescent and star crown */}
      <path d="M100 56a9 9 0 1 0 6 15.5A7 7 0 1 1 106 57.5 9 9 0 0 0 100 56Z" fill={`url(#${gold})`} transform="translate(-4 -4)" />
      {/* Arabic حلال */}
      <text x="100" y="114" textAnchor="middle" fill={`url(#${gold})`} fontSize="34" fontWeight="700" fontFamily="'Noto Naskh Arabic','Amiri','Geeza Pro','Arial',sans-serif" direction="rtl">
        حلال
      </text>
      <path d="M78 126h44" stroke={`url(#${gold})`} strokeWidth="1.2" />
      <path d="M100 122l3 4-3 4-3-4z" fill={`url(#${gold})`} />
    </svg>
  );
}

/** Compact pill: small seal + words, for menus, dish pages and checkout */
export function HalalBadge({ certifier, className = "" }: { certifier?: string | null; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gradient-to-r from-[#4a0f18]/90 to-[#7a1c28]/90 py-1 pl-1 pr-3.5 text-[#f6e3a8] shadow-[0_6px_18px_-10px_#e2bd5e] ${className}`}>
      <HalalSeal className="size-7 shrink-0" title="" />
      <span className="leading-tight">
        <span className="block font-display text-[0.8rem] font-semibold tracking-wide">Halal Certified</span>
        {certifier ? <span className="block text-[0.65rem] text-[#e9dcc4]">by {certifier}</span> : null}
      </span>
    </span>
  );
}
