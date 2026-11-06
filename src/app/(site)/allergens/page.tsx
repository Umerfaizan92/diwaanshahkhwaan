import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { Prose } from "@/components/site/Prose";
import { getPublicMenu } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";
import { toSmsHref, toTelHref } from "@/lib/config/business";
import { DECLARABLE_ALLERGENS } from "@/lib/domain/allergens";

export const metadata: Metadata = {
  title: "Allergen information",
  description: "Allergen information for Diwaan Shah Khwaan dishes, and how to order safely with a food allergy.",
  alternates: { canonical: "/allergens" },
};


export default async function AllergensPage() {
  const [menu, s] = await Promise.all([getPublicMenu(), getSettings()]);
  const phone = s.contacts[0]?.phone ?? null;
  return (
    <>
      <PageHeader title="Allergen information" intro="If you have a food allergy or intolerance, please talk to us before you order." />
      <Container className="space-y-12 py-12">
        <Prose>
          <p>
            We cook in a shared home kitchen. Even when a dish doesn&apos;t contain an allergen as an ingredient, we can&apos;t
            guarantee it&apos;s free from traces. If your allergy is severe, please call us so we can talk it through:
          </p>
          <ul>
            {s.contacts.map((c) => (
              <li key={c.phone}>
                <a href={toTelHref(c.phone)}>{c.phone}</a>
                {c.name ? ` — ${c.name}` : ""}
              </li>
            ))}
          </ul>
          <p>
            Allergens we declare, in line with the Australia New Zealand Food Standards Code: {DECLARABLE_ALLERGENS.join("; ")}.
          </p>
          <p>
            For dishes marked <strong>&ldquo;Call or message to verify&rdquo;</strong>, please call or text us before ordering and
            we&apos;ll confirm the ingredients for you. Don&apos;t assume a dish is free of any allergen.
          </p>
        </Prose>

        {/* Allergens by dish: cards grouped by menu section, so everything fits any screen without sideways scrolling */}
        <section aria-labelledby="by-dish" className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="by-dish" className="font-display text-[clamp(1.5rem,5vw,2rem)]">
              Allergens by dish
            </h2>
            <ul className="flex flex-wrap gap-2 text-xs" aria-label="Key">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-semibold text-success">
                <span aria-hidden>✓</span> Confirmed
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                <span aria-hidden>☎</span> Call or message to verify
              </li>
            </ul>
          </div>
          {menu.map((c) => (
            <div key={c.slug}>
              <h3 className="mb-3 flex items-center gap-3 font-display text-lg text-gold">
                {c.name}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.dishes.map((d) => (
                  <li key={d.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/menu/${d.slug}`} className="min-w-0 font-semibold leading-snug hover:text-gold">
                        {d.name}
                      </Link>
                      {d.allergensConfirmed ? (
                        <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Confirmed</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">Verify with us</span>
                      )}
                    </div>
                    {d.allergensConfirmed ? (
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Contains</dt>
                          <dd className="mt-1 flex flex-wrap gap-1.5">
                            {d.allergens.length ? (
                              d.allergens.map((x) => (
                                <span key={x} className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs font-medium">
                                  {x}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted">None declared</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">May contain</dt>
                          <dd className="mt-1 text-muted">{d.mayContain.length ? d.mayContain.join(", ") : "Nothing listed"}</dd>
                        </div>
                      </dl>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted">Have an allergy? Call or message us to verify the ingredients before you order.</p>
                        {phone ? (
                          <div className="grid grid-cols-2 gap-2">
                            <a href={toTelHref(phone)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gold px-3 text-sm font-semibold text-gold-ink" aria-label={`Call ${phone} about ${d.name}`}>
                              <svg viewBox="0 0 20 20" className="size-4" aria-hidden><path d="M5.5 2.5h2l1.5 4-2 1.2a10 10 0 0 0 5.3 5.3l1.2-2 4 1.5v2a2 2 0 0 1-2 2A14.5 14.5 0 0 1 3.5 4.5a2 2 0 0 1 2-2Z" fill="currentColor" /></svg>
                              Call
                            </a>
                            <a href={toSmsHref(phone, `Hi, I have an allergy question about ${d.name}.`)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-gold/60 px-3 text-sm font-semibold text-text hover:bg-gold/10" aria-label={`Message ${phone} about ${d.name}`}>
                              <svg viewBox="0 0 20 20" className="size-4" aria-hidden><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v8a1.5 1.5 0 0 1-1.5 1.5H8l-4 3v-3h0.5A1.5 1.5 0 0 1 3 12.5v-8Z" fill="currentColor" /></svg>
                              Message
                            </a>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Not sure about a dish? We&apos;re happy to talk you through the ingredients.</p>
            {s.contacts[0] ? (
              <a href={toTelHref(s.contacts[0].phone)} className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-gold-ink">
                Call {s.contacts[0].phone}
              </a>
            ) : null}
          </div>
        </section>
      </Container>
    </>
  );
}
