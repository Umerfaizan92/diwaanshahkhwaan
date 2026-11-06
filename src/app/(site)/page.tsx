import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { DishCard } from "@/components/site/DishCard";
import { MenuCategories } from "@/components/site/MenuCategories";
import { PickupContact } from "@/components/site/PickupContact";
import { Container, SectionTitle } from "@/components/site/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { getFavouriteDishes, getPublicMenu } from "@/lib/server/menu";
import { DishCarousel } from "@/components/site/DishCarousel";
import { cardImage } from "@/lib/domain/images";
import { HalalSeal } from "@/components/site/HalalSeal";
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
      <Hero
        pickupArea={settings.pickupArea}
        acceptingOrders={settings.acceptingOrders}
        halal={settings.halalCertified}
        dishes={menu
          .flatMap((c) => c.dishes)
          .filter((d) => d.isAvailable && d.image?.startsWith("/images/dishes/menu/"))
          .map((d) => ({ slug: d.slug, name: d.name, src: d.image! }))}
      />

      {settings.halalCertified ? (
        <section aria-label="Halal certified" className="on-dark relative overflow-hidden border-y border-[#d9b45a]/40 bg-[linear-gradient(100deg,#2a0910,#5a1420_45%,#2a0910)] text-[#f7efe0]">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgb(226_189_94/0.18),transparent_70%)]" />
          <Container className="relative flex flex-col items-center gap-5 py-10 text-center sm:flex-row sm:text-left">
            <HalalSeal className="size-24 shrink-0 drop-shadow-[0_10px_24px_rgb(0_0_0/0.55)] sm:size-28" />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold tracking-[0.2em] text-[#f3d68a]">Our royal promise</p>
              <h2 className="mt-1 font-display text-[clamp(1.4rem,4.5vw,2rem)] font-semibold text-[#fbf4e6]">
                <span className="gold-leaf">100% Halal Certified</span> kitchen
              </h2>
              <p className="mt-2 max-w-2xl text-[#e9dcc4]">
                Every dish is prepared with halal-certified meat and ingredients, cooked with care in our family kitchen.
                {settings.halalCertifier ? ` Certified by ${settings.halalCertifier}${settings.halalCertNumber ? ` (certificate ${settings.halalCertNumber})` : ""}.` : ""}
              </p>
            </div>
          </Container>
        </section>
      ) : null}

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

      {/* Kitchen story: one cinematic "royal table" image of our dishes covering the whole section */}
      <section aria-labelledby="kitchen" className="on-dark relative isolate overflow-hidden bg-[#0d0907] text-[#f7efe0]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/dishes/royal-feast.webp"
          srcSet="/images/dishes/sm/royal-feast.webp 900w, /images/dishes/royal-feast.webp 1672w"
          sizes="100vw"
          alt="A royal family table set with chicken biryani, mutton curry, seekh kebabs, naan, raita and gulab jamun"
          loading="lazy"
          decoding="async"
          className="block aspect-[5/4] w-full object-cover object-[45%_75%] sm:aspect-[16/9] lg:absolute lg:inset-0 lg:-z-10 lg:aspect-auto lg:h-full lg:object-[30%_center]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 hidden lg:block lg:bg-[linear-gradient(90deg,rgb(10_7_5/0.15)_0%,rgb(10_7_5/0.45)_45%,rgb(10_7_5/0.93)_70%)]" />
        <Container className="flex py-12 lg:min-h-[44rem] lg:items-center lg:justify-end lg:py-24">
          <div className="max-w-xl">
            <p className="hero-shadow font-display text-sm font-semibold tracking-wide text-[#f3d68a]">Our kitchen</p>
            <h2 id="kitchen" className="hero-shadow mt-2 font-display text-[clamp(1.9rem,6vw,2.6rem)] font-semibold leading-tight text-[#fbf4e6]">
              A family kitchen with a royal table
            </h2>
            <div className="hero-shadow mt-5 space-y-4 text-[clamp(1rem,3.6vw,1.12rem)] text-[#f7efe0]">
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
            <Link
              href="/about"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-[#f3d68a]/80 bg-black/40 px-6 font-semibold text-[#fbf4e6] backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              About our kitchen
            </Link>
          </div>
        </Container>
      </section>

      {/* Menu at a glance */}
      <section aria-labelledby="menu-preview" className="py-20 lg:py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              id="menu-preview"
              title="Explore the menu"
              intro={settings.gstRegistered && settings.gstMode === "ADD_ON" ? "Our royal collections, cooked fresh to order. Menu prices are before GST; 10% GST is added at checkout." : "Royal collections, cooked fresh to order."}
            />
            <Link href="/menu" className={buttonClass("gold", "md", "mb-8 lg:mb-10")}>
              View full menu
            </Link>
          </div>
          <MenuCategories
            categories={menu.map((c) => {
              const withPhoto = c.dishes.find((d) => d.image && d.image.startsWith("/")) ?? c.dishes.find((d) => d.image);
              return {
                slug: c.slug,
                name: c.name,
                description: c.description,
                count: c.dishes.length,
                fromCents: Math.min(...c.dishes.map((d) => d.priceCents)),
                image: cardImage(withPhoto?.image ?? null),
              };
            })}
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
