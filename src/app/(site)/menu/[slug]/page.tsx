import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DishImage } from "@/components/site/DishImage";
import { DishTags, SpiceMeter } from "@/components/site/DishCard";
import { HalalBadge } from "@/components/site/HalalSeal";
import { Container } from "@/components/site/PageHeader";
import { AddToCart } from "@/components/shop/AddToCart";
import { formatCentsShort } from "@/lib/domain/money";
import { DAY_NAMES } from "@/lib/domain/hours";
import { getDishBySlug } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";
import { toSmsHref, toTelHref } from "@/lib/config/business";
import { JsonLd } from "@/components/site/JsonLd";
import { dishLd } from "@/lib/server/structured-data";

export async function generateMetadata({ params }: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dish = await getDishBySlug(slug);
  if (!dish) return { title: "Dish not found" };
  return {
    title: `${dish.name} | Pickup in Langford, Perth`,
    description: `${dish.shortDescription}. ${formatCentsShort(dish.priceCents)} — order ahead for pickup in Langford WA.`,
    alternates: { canonical: `/menu/${dish.slug}` },
    openGraph: dish.image ? { images: [{ url: dish.image, alt: dish.imageAlt }] } : undefined,
    twitter: { card: "summary_large_image" },
  };
}

export default async function DishPage({ params }: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const [dish, settings] = await Promise.all([getDishBySlug(slug), getSettings()]);
  if (!dish) notFound();
  const phone = settings.contacts[0]?.phone;

  return (
    <Container className="pb-10 pt-24 lg:pt-32">
      <JsonLd data={dishLd(dish)} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/menu" className="hover:text-gold">
              Menu
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/menu#${dish.categorySlug}`} className="hover:text-gold">
              {dish.categoryName}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <DishImage
            src={dish.image}
            alt={dish.imageAlt}
            name={dish.name}
            sizes="(min-width:1024px) 45vw, 92vw"
            priority
            showName
            className={`mx-auto aspect-[16/10] w-full max-w-xl ${dish.isAvailable ? "" : "opacity-60 grayscale"}`}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <DishTags dish={dish} />
          </div>
          {settings.halalCertified ? <HalalBadge certifier={settings.halalCertifier} className="mt-3" /> : null}
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{dish.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="font-display text-2xl text-gold">{formatCentsShort(dish.priceCents)}</span>
            {settings.gstRegistered && settings.gstMode === "ADD_ON" ? <span className="text-sm text-muted">+ GST</span> : null}
            {dish.portion ? <span className="text-muted">{dish.portion}</span> : null}
            <SpiceMeter level={dish.spiceLevel} />
          </div>
          <p className="mt-5 max-w-prose text-lg text-text/90">{dish.description}</p>

          <div className="mt-8">
            <AddToCart dish={dish} acceptingOrders={settings.acceptingOrders} />
          </div>

          <dl className="mt-10 divide-y divide-line/70 border-y border-line/70">
            {dish.ingredients ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
                <dt className="font-semibold">Ingredients</dt>
                <dd className="text-muted">{dish.ingredients}</dd>
              </div>
            ) : null}
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="font-semibold">Allergens</dt>
              <dd className="text-muted">
                {dish.allergensConfirmed ? (
                  <>
                    {dish.allergens.length ? `Contains: ${dish.allergens.join(", ")}.` : "No declared allergens."}
                    {dish.mayContain.length ? ` May contain: ${dish.mayContain.join(", ")}.` : ""}
                  </>
                ) : (
                  <>
                    Have an allergy? Please{" "}
                    {phone ? (
                      <>
                        <a href={toTelHref(phone)} className="text-gold underline">
                          call
                        </a>{" "}
                        or{" "}
                        <a href={toSmsHref(phone, `Hi, I have an allergy question about ${dish.name}.`)} className="text-gold underline">
                          message {phone}
                        </a>
                      </>
                    ) : (
                      "call or message us"
                    )}{" "}
                    to verify the ingredients before ordering.
                  </>
                )}{" "}
                We cook in a shared home kitchen, so we can&apos;t guarantee any dish is free from traces of allergens.{" "}
                <Link href="/allergens" className="text-gold underline">
                  Allergen information
                </Link>
              </dd>
            </div>
            {dish.availableDays.length ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
                <dt className="font-semibold">Available on</dt>
                <dd className="text-muted">{dish.availableDays.map((d) => DAY_NAMES[d]).join(", ")}</dd>
              </div>
            ) : null}
            {dish.prepLeadHours > settings.minNoticeHours ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
                <dt className="font-semibold">Notice needed</dt>
                <dd className="text-muted">Order at least {dish.prepLeadHours} hours ahead.</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </Container>
  );
}
