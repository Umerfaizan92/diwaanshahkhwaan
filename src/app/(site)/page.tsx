import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { DishCard } from "@/components/site/DishCard";
import { MenuPreview } from "@/components/site/MenuPreview";
import { PickupContact } from "@/components/site/PickupContact";
import { Container, SectionTitle } from "@/components/site/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { getFavouriteDishes, getPublicMenu } from "@/lib/server/menu";
import { DishCarousel } from "@/components/site/DishCarousel";
import { cardImage } from "@/lib/domain/images";
import { getOpeningHours, getSettings } from "@/lib/server/settings";
import { toTelHref } from "@/lib/config/business";
import { JsonLd } from "@/components/site/JsonLd";
import { restaurantLd, websiteLd } from "@/lib/server/structured-data";

const STEPS = [
  { t: "Choose your dishes", d: "Browse the menu and add what you'd like. Pick your spice level where it applies." },
  { t: "Pick a pickup time", d: "Choose a date and time slot. We cook to order, so slots are limited each day." },
  { t: "Pay your way", d: "Pay by card through Stripe's secure checkout, or choose cash and pay when you pick up." },
  { t: "Collect it fresh", d: "We'll email you when it's ready. Pick up from our kitchen in Langford." },
];

export default async function HomePage() {
  const [settings, hours, featured, menu] = await Promise.all([getSettings(), getOpeningHours(), getFavouriteDishes(), getPublicMenu()]);

  return (
    <>
      <JsonLd data={restaurantLd(settings, hours)} />
      <JsonLd data={websiteLd(settings)} />
      <Hero pickupArea={settings.pickupArea} acceptingOrders={settings.acceptingOrders} />

      {/* Signature dishes */}
      <section aria-labelledby="signature" className="py-20 lg:py-28">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle id="signature" title="Customer favourites" intro="Our most-ordered dishes, updated automatically as orders come in." />
            <Link href="/menu" className={buttonClass("outline", "md", "mb-8 lg:mb-10")}>
              Full menu
            </Link>
          </div>
          <DishCarousel label="Customer favourite dishes">
            {featured.map((d) => (
              <DishCard key={d.id} dish={d} sizes="(min-width:1024px) 23vw, (min-width:768px) 31vw, (min-width:640px) 44vw, 78vw" />
            ))}
          </DishCarousel>
        </Container>
      </section>

      {/* How it works — a genuine sequence, so it's numbered */}
      <section aria-labelledby="how" className="border-y border-line/60 bg-sunken py-20 lg:py-24">
        <Container>
          <SectionTitle id="how" title="Ordered ahead, cooked for you" intro="Everything is made to order in small batches, so we take orders in advance." />
          <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="relative pl-14">
                <span aria-hidden className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-gold/60 font-display text-gold">
                  {i + 1}
                </span>
                <h3 className="font-display text-lg">{s.t}</h3>
                <p className="mt-2 text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Kitchen story */}
      <section aria-labelledby="kitchen" className="py-20 lg:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-5 gap-3 lg:max-w-none">
            <div className="arch relative col-span-3 aspect-[3/4] overflow-hidden">
              <Image src="/images/dishes/tikka-skewers.webp" alt="Chicken tikka skewers being grilled over charcoal" fill sizes="(min-width:1024px) 28vw, 55vw" className="object-cover" />
            </div>
            <div className="col-span-2 flex flex-col gap-3 pt-8 sm:pt-16">
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src="/images/dishes/chicken-karahi.webp" alt="Chicken karahi with ginger and green chilli" fill sizes="(min-width:1024px) 18vw, 35vw" className="object-cover" />
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image src="/images/dishes/biryani-trays.webp" alt="Trays of chicken biryani" fill sizes="(min-width:1024px) 18vw, 35vw" className="object-cover" />
              </div>
            </div>
          </div>
          <div>
            <h2 id="kitchen" className="font-display text-3xl font-semibold sm:text-4xl">
              A family kitchen with a royal table
            </h2>
            <div className="mt-6 max-w-prose space-y-4 text-lg text-text/85">
              <p>
                Diwaan Shah Khwaan is a home kitchen cooking Pakistani and Mughlai favourites the way they&apos;re made at
                family celebrations. Biryani is layered by hand, karahi is finished to order, and the BBQ is grilled fresh
                for your pickup.
              </p>
              <p>
                We cook in small batches from our home kitchen in Langford, so we take orders ahead and have everything
                ready, hot and packed, when you arrive.
              </p>
            </div>
            <Link href="/about" className={buttonClass("outline", "md", "mt-8")}>
              About our kitchen
            </Link>
          </div>
        </Container>
      </section>

      {/* Menu preview */}
      <section aria-labelledby="menu-preview" className="border-t border-line/60 py-20 lg:py-24">
        <Container>
          <SectionTitle id="menu-preview" title="The menu" intro="Menu prices are before GST. 10% GST is added to your order total at checkout." />
          <MenuPreview
            categories={menu.map((c) => ({
              slug: c.slug,
              name: c.name,
              description: c.description,
              items: c.dishes.map((d) => ({ slug: d.slug, name: d.name, shortDescription: d.shortDescription, priceCents: d.priceCents, isAvailable: d.isAvailable, portion: d.portion, image: cardImage(d.image) })),
            }))}
          />
        </Container>
      </section>

      {/* Bulk & BBQ */}
      <section aria-labelledby="bulk" className="on-dark relative isolate overflow-hidden bg-maroon py-20 text-[#f6e7cf] lg:py-24">
        <Image src="/images/dishes/chicken-tikka-grill.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-25 mix-blend-luminosity" />
        <Container className="max-w-3xl text-center">
          <h2 id="bulk" className="font-display text-3xl font-semibold sm:text-4xl">
            Your celebration, our royal flavours
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#f6e7cf]/90">
            We take large BBQ and bulk orders for gatherings of any size. Choose your chicken tikka, seekh kebab, beef or lamb
            tikka and quantities, and we&apos;ll tailor a feast to your occasion.
          </p>
          <div className="mx-auto mt-8 grid max-w-sm gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center [&>*]:w-full sm:[&>*]:w-auto">
            <Link href="/contact?topic=bulk" className={buttonClass("gold", "lg")}>
              Ask about a bulk order
            </Link>
            {settings.contacts[0] ? (
              <a href={toTelHref(settings.contacts[0].phone)} className={buttonClass("outline", "lg", "border-[#f6e7cf]/50 text-[#f6e7cf] hover:bg-[#f6e7cf]/10")}>
                Call {settings.contacts[0].phone}
              </a>
            ) : null}
          </div>
        </Container>
      </section>

      {/* Contact & pickup */}
      <section aria-labelledby="visit" className="py-20 lg:py-24">
        <Container>
          <SectionTitle id="visit" title="Ordering & pickup" />
          <PickupContact settings={settings} hours={hours} />
        </Container>
      </section>
    </>
  );
}
