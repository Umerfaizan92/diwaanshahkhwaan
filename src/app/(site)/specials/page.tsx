import type { Metadata } from "next";
import { DishCard } from "@/components/site/DishCard";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getDailySpecials } from "@/lib/server/menu";

export const metadata: Metadata = {
  title: "Daily specials",
  description: "This week's Shahi specials from Diwaan Shah Khwaan, available to order ahead for pickup in Langford WA.",
  alternates: { canonical: "/specials" },
};

export default async function SpecialsPage() {
  const specials = await getDailySpecials();
  return (
    <>
      <PageHeader title="Specials" intro="Chef's picks right now. Specials change often, so order ahead while they're on." />
      <Container className="py-12">
        {specials.length ? (
          <ul className="grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
            {specials.map((d, i) => (
              <li key={d.id}>
                <DishCard dish={d} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-16 text-center">
            <p className="text-lg text-muted">There are no specials on right now. The full menu is always available to order ahead.</p>
            <ButtonLink href="/menu" className="mt-6">
              Browse the menu
            </ButtonLink>
          </div>
        )}
      </Container>
    </>
  );
}
