import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { getSettings } from "@/lib/server/settings";
import { formatTime12 } from "@/lib/domain/hours";
import { JsonLd } from "@/components/site/JsonLd";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Ordering, pickup, payment, allergens and bulk orders at Diwaan Shah Khwaan, Langford WA.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const s = await getSettings();
  const phone = s.contacts.map((c) => c.phone).join(" or ");
  const faqs: { q: string; a: React.ReactNode }[] = [
    { q: "Do you deliver?", a: <>No — we&apos;re pickup only, from our kitchen in the {s.pickupArea} area.</> },
    {
      q: "Where do I pick up?",
      a: <>In {s.pickupArea}. We&apos;re a home kitchen, so the exact address is included in your paid order confirmation email and on your order page.</>,
    },
    {
      q: "How far in advance do I need to order?",
      a: (
        <>
          At least {s.minNoticeHours} hours before pickup, and up to {s.maxAdvanceDays} days ahead.
          {s.orderCutoffTime ? <> Orders for a day close at {formatTime12(s.orderCutoffTime)} the day before.</> : null} Some dishes need longer notice; it&apos;s shown on the dish.
        </>
      ),
    },
    { q: "Why can't I pick a certain time?", a: "Each pickup slot takes a limited number of orders so we can cook everything fresh. If a time isn't shown, it's full or outside our hours." },
    { q: "How do I pay?", a: "Pay by card through Stripe's secure online checkout (we never see or store your card details), or choose cash and pay when you pick up. 10% GST is added to the order total." },
    { q: "Do I need an account?", a: <>No. You can check out as a guest. With an account, your order history and receipts are in one place — <Link href="/account">sign in or create one</Link>.</> },
    { q: "How do I know my order is ready?", a: "We email you when your order is ready for pickup. You can also follow its progress using the link in your confirmation email." },
    { q: "Can I change or cancel my order?", a: <>Contact us at least {s.cancelDeadlineHours} hours before pickup. See our <Link href="/refunds">refund and cancellation policy</Link>.</> },
    { q: "Do you cater for allergies?", a: <>Please tell us before you order. We cook in a shared home kitchen and can&apos;t guarantee any dish is allergen-free. See <Link href="/allergens">allergen information</Link>.</> },
    { q: "Do you take bulk or BBQ orders for events?", a: <>Yes. Call {phone}, or <Link href="/contact?topic=bulk">send us the details</Link> and we&apos;ll put together a quote.</> },
    { q: "Are prices in Australian dollars?", a: "Yes. Prices are in AUD and are the full price you pay — there are no card or booking fees." },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((f) => typeof f.a === "string")
      .map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a as string } })),
  };
  return (
    <>
      <PageHeader title="Frequently asked questions" />
      <Container className="py-12">
        <div className="max-w-3xl divide-y divide-line/70 border-y border-line/70">
          {faqs.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="text-2xl text-gold transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="pb-5 text-text/85 [&_a]:text-gold [&_a]:underline">{f.a}</div>
            </details>
          ))}
        </div>
      </Container>
      <JsonLd data={jsonLd} />
    </>
  );
}
