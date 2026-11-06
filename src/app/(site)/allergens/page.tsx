import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { Prose } from "@/components/site/Prose";
import { getPublicMenu } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";
import { toTelHref } from "@/lib/config/business";
import { DECLARABLE_ALLERGENS } from "@/lib/domain/allergens";

export const metadata: Metadata = {
  title: "Allergen information",
  description: "Allergen information for Diwaan Shah Khwaan dishes, and how to order safely with a food allergy.",
  alternates: { canonical: "/allergens" },
};


export default async function AllergensPage() {
  const [menu, s] = await Promise.all([getPublicMenu(), getSettings()]);
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
            Dishes marked <strong>&ldquo;being confirmed&rdquo;</strong> below don&apos;t have their allergen details finalised yet. Don&apos;t
            assume they&apos;re free of any allergen — ask us first.
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
              <li className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 font-semibold text-warning">
                <span aria-hidden>!</span> Being confirmed
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
                        <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">Being confirmed</span>
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
                      <p className="text-sm text-muted">Allergen details are still being confirmed. Please ask us before ordering.</p>
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
