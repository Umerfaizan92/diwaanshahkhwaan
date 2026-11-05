import Link from "next/link";
import Image from "next/image";
import { toTelHref } from "@/lib/config/business";
import type { BusinessSettings, OpeningHours } from "@/lib/db/schema";
import { formatHoursSummary } from "@/lib/domain/hours";

const LEGAL = [
  { href: "/faq", label: "FAQs" },
  { href: "/allergens", label: "Allergen information" },
  { href: "/refunds", label: "Refunds & cancellations" },
  { href: "/terms", label: "Terms & conditions" },
  { href: "/privacy", label: "Privacy policy" },
];

export function Footer({ settings, hours }: { settings: BusinessSettings; hours: OpeningHours[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-8 border-t border-line bg-sunken">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="Diwaan Shah Khwaan home">
            <Image src="/images/brand/emblem.png" alt="" width={56} height={56} className="size-14 rounded-full ring-1 ring-gold/40" />
            <span className="font-display text-xl leading-tight">
              <span className="gold-leaf font-bold">Diwaan</span>
              <br />
              Shah Khwaan
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-muted">{settings.tagline}. Home-cooked to order and collected fresh from our kitchen.</p>
        </div>

        <div>
          <h2 className="font-display text-base text-gold">Orders &amp; enquiries</h2>
          <ul className="mt-4 space-y-3">
            {settings.contacts.map((c) => (
              <li key={c.phone}>
                <a href={toTelHref(c.phone)} className="text-lg font-semibold hover:text-gold">
                  {c.phone}
                </a>
                {c.name ? <span className="block text-sm text-muted">{c.name}</span> : null}
              </li>
            ))}
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-gold">
                  {settings.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base text-gold">Pickup</h2>
          <p className="mt-4">{settings.pickupArea}</p>
          <p className="mt-1 text-sm text-muted">Exact address is sent with your order confirmation.</p>
          <h3 className="mt-5 text-sm font-semibold">Pickup hours</h3>
          <ul className="mt-1 space-y-0.5 text-sm text-muted">
            {formatHoursSummary(hours).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>

        <nav aria-label="Information">
          <h2 className="font-display text-base text-gold">Information</h2>
          <ul className="mt-4 space-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-text/85 hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {settings.legalName ?? settings.businessName}
            {settings.abn ? ` · ABN ${settings.abn}` : ""}
          </p>
          <p>Prices in AUD. Pickup only — we don&apos;t deliver.</p>
        </div>
      </div>
    </footer>
  );
}
