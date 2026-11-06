import type { Metadata } from "next";
import { DishCard } from "@/components/site/DishCard";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { getPublicMenu } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";
import { JsonLd } from "@/components/site/JsonLd";
import { menuLd } from "@/lib/server/structured-data";
import { CategoryJump } from "@/components/site/CategoryJump";
import { HalalBadge } from "@/components/site/HalalSeal";

export const metadata: Metadata = {
  title: "Menu",
  description: "Pakistani menu in Langford, Perth: chicken biryani, karahi, Shahi BBQ platters, burgers, wraps and desserts. Order online for pickup, pay by card or cash.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getSettings()]);
  return (
    <>
      <JsonLd data={menuLd(menu)} />
      <PageHeader
        title="Menu"
        intro={
          <>
            Cooked fresh for each order. Choose your dishes, then pick a pickup time at checkout — we need at least{" "}
            {settings.minNoticeHours} hours&apos; notice.
            {settings.gstRegistered && settings.gstMode === "ADD_ON" ? " Prices shown are before GST; 10% GST is added at checkout." : null}
            {settings.halalCertified ? (
              <span className="mt-4 block">
                <HalalBadge certifier={settings.halalCertifier} />
              </span>
            ) : null}
          </>
        }
      />
      {/* Categories: a dropdown on phones (no sideways scrolling), wrapped buttons on larger screens */}
      <nav aria-label="Menu categories" className="sticky top-16 z-20 border-b border-line/60 bg-bg/95 backdrop-blur lg:top-[4.5rem]">
        <Container className="py-2.5">
          <div className="md:hidden">
            <CategoryJump categories={menu.map((c) => ({ slug: c.slug, name: c.name }))} />
          </div>
          <ul className="hidden flex-wrap gap-1.5 md:flex">
            {menu.map((c) => (
              <li key={c.slug}>
                <a href={`#${c.slug}`} className="block rounded-full border border-line px-3.5 py-1.5 text-sm text-text/85 transition-colors hover:border-gold hover:text-gold">
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
      <Container className="pt-10">
        {menu.length === 0 ? (
          <p className="py-20 text-center text-muted">The menu is being updated. Please check back soon or call us to order.</p>
        ) : null}
        {menu.map((c, ci) => (
          <section key={c.slug} id={c.slug} aria-labelledby={`h-${c.slug}`} className="scroll-mt-32 py-10 lg:scroll-mt-36">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line/60 pb-4">
              <h2 id={`h-${c.slug}`} className="font-display text-2xl font-semibold sm:text-3xl">
                {c.name}
              </h2>
              {c.description ? <p className="text-muted">{c.description}</p> : null}
            </div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
              {c.dishes.map((d, di) => (
                <li key={d.id}>
                  <DishCard dish={d} priority={ci === 0 && di < 2} sizes="(min-width:1024px) 22vw, (min-width:768px) 30vw, 46vw" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
