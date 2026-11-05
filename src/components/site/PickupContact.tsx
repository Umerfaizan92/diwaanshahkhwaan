import { toTelHref } from "@/lib/config/business";
import type { BusinessSettings, OpeningHours } from "@/lib/db/schema";
import { formatHoursSummary } from "@/lib/domain/hours";

/** Phone numbers, pickup area and hours — the practical block used on home and contact */
export function PickupContact({ settings, hours }: { settings: BusinessSettings; hours: OpeningHours[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
      <div className="bg-raised p-6 sm:p-8">
        <h3 className="font-display text-lg text-gold">Call or text to order</h3>
        <ul className="mt-4 space-y-4">
          {settings.contacts.map((c) => (
            <li key={c.phone}>
              <a href={toTelHref(c.phone)} className="font-display text-2xl tracking-wide hover:text-gold">
                {c.phone}
              </a>
              <span className="block text-sm text-muted">{c.name ? `${c.name} · ` : ""}{c.role}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-raised p-6 sm:p-8">
        <h3 className="font-display text-lg text-gold">Pickup</h3>
        <p className="mt-4 text-xl">{settings.pickupArea}</p>
        <p className="mt-2 text-muted">
          We&apos;re a home kitchen, so the exact address is sent privately with your paid order confirmation.
        </p>
      </div>
      <div className="bg-raised p-6 sm:p-8">
        <h3 className="font-display text-lg text-gold">Pickup hours</h3>
        <ul className="mt-4 space-y-1">
          {formatHoursSummary(hours).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Orders need at least {settings.minNoticeHours} hours&apos; notice.</p>
      </div>
    </div>
  );
}
