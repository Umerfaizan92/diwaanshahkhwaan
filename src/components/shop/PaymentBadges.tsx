/** Card-acceptance marks and security icons for the checkout. Simple inline SVGs: no external requests. */

export function CardMarks({ className = "" }: { className?: string }) {
  const box = "flex h-7 w-11 items-center justify-center rounded-md bg-white ring-1 ring-black/10";
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Accepted: Visa, Mastercard, American Express, Apple Pay, Google Pay">
      <li className={box} title="Visa">
        <svg viewBox="0 0 48 16" className="h-3.5" aria-hidden><text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="15" fill="#1a1f71">VISA</text></svg>
      </li>
      <li className={box} title="Mastercard">
        <svg viewBox="0 0 32 20" className="h-4" aria-hidden><circle cx="12" cy="10" r="8" fill="#eb001b" /><circle cx="20" cy="10" r="8" fill="#f79e1b" /><path d="M16 3.1a8 8 0 0 1 0 13.8 8 8 0 0 1 0-13.8Z" fill="#ff5f00" /></svg>
      </li>
      <li className={`${box} bg-[#2e77bc]! ring-0`} title="American Express">
        <svg viewBox="0 0 48 16" className="h-3" aria-hidden><text x="24" y="12.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" fill="#fff">AMEX</text></svg>
      </li>
      <li className={`${box} bg-black! ring-0`} title="Apple Pay">
        <svg viewBox="0 0 48 18" className="h-3.5" aria-hidden>
          <path d="M9.2 4.6c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5 1 .1 1.9-.5 2.5-1.2Zm.9 1.4c-1.4-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.3 1.2-2.4 0 0-2.3-.9-2.3-3.5 0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.3-1.6Z" fill="#fff" transform="translate(2 -1) scale(.95)" />
          <text x="31" y="13.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="11" fill="#fff">Pay</text>
        </svg>
      </li>
      <li className={box} title="Google Pay">
        <svg viewBox="0 0 48 18" className="h-3.5" aria-hidden>
          <text x="9" y="14" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="14"><tspan fill="#4285f4">G</tspan></text>
          <text x="30" y="13.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="11" fill="#3c4043">Pay</text>
        </svg>
      </li>
    </ul>
  );
}

const icon = "size-5 shrink-0 text-success";
export const LockIcon = ({ className = icon }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    <rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="10" cy="13.5" r="1.3" fill="currentColor" />
  </svg>
);
export const ShieldIcon = ({ className = icon }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    <path d="M10 2 3.5 4.5V9c0 4 2.8 7.4 6.5 8.5 3.7-1.1 6.5-4.5 6.5-8.5V4.5L10 2Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m7 10 2.2 2.2L13.5 8" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const CardIcon = ({ className = icon }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    <rect x="2" y="4.5" width="16" height="11" rx="2" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 8h16" stroke="currentColor" strokeWidth="2" />
    <path d="M5 12.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
export const BankIcon = ({ className = icon }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    <path d="M10 2.5 2.5 6.5h15L10 2.5Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M4.5 8.5v6M8.2 8.5v6M11.8 8.5v6M15.5 8.5v6M2.5 17h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
export const CashIcon = ({ className = icon }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    <rect x="2" y="5" width="16" height="10" rx="1.5" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

/** Trust strip shown under the payment options */
export function SecurityPoints() {
  const items = [
    { Icon: LockIcon, t: "256-bit SSL encryption", d: "Every page is served over HTTPS." },
    { Icon: ShieldIcon, t: "PCI DSS Level 1 checkout", d: "Card details go straight to Stripe. We never see or store them." },
    { Icon: CardIcon, t: "3D Secure verification", d: "Your bank may ask you to confirm the payment." },
    { Icon: BankIcon, t: "Paid to our business account", d: "Receipt emailed as soon as payment succeeds." },
  ];
  return (
    <ul className="grid gap-3 rounded-2xl border border-success/30 bg-success/5 p-4 sm:grid-cols-2">
      {items.map(({ Icon, t, d }) => (
        <li key={t} className="flex gap-2.5">
          <Icon />
          <span className="text-sm">
            <span className="block font-semibold">{t}</span>
            <span className="text-muted">{d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
