import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { PickupContact } from "@/components/site/PickupContact";
import { getOpeningHours, getSettings } from "@/lib/server/settings";
import { formatTime12 } from "@/lib/domain/hours";

export const metadata: Metadata = {
  title: "How ordering works",
  description: "Order ahead online, choose a pickup time, pay securely and collect from Langford WA.",
  alternates: { canonical: "/order-ahead" },
};

export default async function OrderAheadPage() {
  const [s, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  const rules = [
    { t: "Notice", d: `Orders need at least ${s.minNoticeHours} hours' notice. Some dishes need longer — it's shown on the dish.` },
    { t: "How far ahead", d: `You can book up to ${s.maxAdvanceDays} days in advance.` },
    s.orderCutoffTime
      ? { t: "Daily cut-off", d: `Orders for a given day close at ${formatTime12(s.orderCutoffTime)} the day before.` }
      : null,
    { t: "Pickup slots", d: `Pickup times are in ${s.slotMinutes}-minute slots. Each slot takes a limited number of orders so everything is fresh.` },
    { t: "Payment", d: "You pay online when you order. Your order is confirmed once payment goes through, and we email your receipt." },
    { t: "Changes and cancellations", d: `Contact us at least ${s.cancelDeadlineHours} hours before pickup to change or cancel. See our refund policy for details.` },
  ].filter(Boolean) as { t: string; d: string }[];

  return (
    <>
      <PageHeader title="How ordering works" intro="We cook everything to order, so we take orders in advance and have it ready when you arrive." />
      <Container className="py-12">
        <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {[
            ["Choose your dishes", "Add dishes to your order from the menu. Pick a spice level where it applies."],
            ["Pick a pickup date and time", "Only times we can actually cook for are shown, so if you can book it, we can make it."],
            ["Pay securely", "Checkout is handled by our payment provider. We never see or store your card details."],
            ["Get your confirmation", "We email your receipt and the pickup address. You can follow your order's progress online."],
            ["Collect it fresh", "We'll let you know when it's ready. Bring your order number."],
          ].map(([t, d], i) => (
            <li key={t} className="relative pl-14">
              <span aria-hidden className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-gold/60 font-display text-gold">
                {i + 1}
              </span>
              <h2 className="font-display text-xl">{t}</h2>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 font-display text-2xl sm:text-3xl">Good to know</h2>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
          {rules.map((r) => (
            <div key={r.t} className="bg-raised p-6">
              <dt className="font-semibold text-gold">{r.t}</dt>
              <dd className="mt-1 text-text/85">{r.d}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/menu" size="lg">
            Start your order
          </ButtonLink>
          <ButtonLink href="/faq" variant="outline" size="lg">
            Read the FAQs
          </ButtonLink>
        </div>

        <div className="mt-16">
          <PickupContact settings={s} hours={hours} />
        </div>
      </Container>
    </>
  );
}
