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
  const dishes = menu.flatMap((c) => c.dishes);
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

        <div className="overflow-x-auto rounded-2xl border border-line" tabIndex={0} role="region" aria-label="Allergens by dish table">
          <table className="w-full min-w-[36rem] text-left text-[0.95rem]">
            <caption className="sr-only">Allergens by dish</caption>
            <thead className="bg-raised">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Dish</th>
                <th scope="col" className="px-4 py-3 font-semibold">Contains</th>
                <th scope="col" className="px-4 py-3 font-semibold">May contain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {dishes.map((d) => (
                <tr key={d.id}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link href={`/menu/${d.slug}`} className="hover:text-gold">
                      {d.name}
                    </Link>
                  </th>
                  {d.allergensConfirmed ? (
                    <>
                      <td className="px-4 py-3">{d.allergens.length ? d.allergens.join(", ") : "None declared"}</td>
                      <td className="px-4 py-3 text-muted">{d.mayContain.length ? d.mayContain.join(", ") : "—"}</td>
                    </>
                  ) : (
                    <td colSpan={2} className="px-4 py-3 text-warning">
                      Being confirmed — please ask us before ordering
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </>
  );
}
