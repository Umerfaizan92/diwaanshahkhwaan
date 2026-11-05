import "server-only";
import type { BusinessSettings, OpeningHours } from "@/lib/db/schema";
import type { PublicCategory, PublicDish } from "./menu";

const base = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const price = (c: number) => (c / 100).toFixed(2);

/** Restaurant without a street address: only locality, as the owner asked */
export function restaurantLd(s: BusinessSettings, hours: OpeningHours[]) {
  const [locality] = s.pickupArea.split(/\s+WA\b/);
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${base()}/#restaurant`,
    name: s.businessName,
    slogan: s.tagline,
    url: base(),
    image: `${base()}/images/dishes/bbq-platter-closeup.webp`,
    logo: `${base()}/images/brand/emblem.png`,
    telephone: s.contacts.map((c) => c.phone.replace(/^0/, "+61 ").replace(/\s+/g, " ")),
    servesCuisine: ["Pakistani", "Mughlai", "BBQ"],
    priceRange: "$$",
    currenciesAccepted: "AUD",
    paymentAccepted: "Credit card, Debit card",
    address: { "@type": "PostalAddress", addressLocality: locality.trim(), addressRegion: "WA", postalCode: (s.pickupArea.match(/\b\d{4}\b/) ?? [""])[0], addressCountry: "AU" },
    hasMenu: `${base()}/menu`,
    acceptsReservations: false,
    openingHoursSpecification: hours.filter((h) => h.isOpen).map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY[h.dayOfWeek], opens: h.openTime, closes: h.closeTime })),
    potentialAction: { "@type": "OrderAction", target: { "@type": "EntryPoint", urlTemplate: `${base()}/menu`, actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] }, deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp" },
  };
}

function itemLd(d: PublicDish) {
  return {
    "@type": "MenuItem",
    name: d.name,
    description: d.description || d.shortDescription,
    url: `${base()}/menu/${d.slug}`,
    ...(d.image ? { image: `${base()}${d.image}` } : {}),
    ...(d.isVegetarian ? { suitableForDiet: "https://schema.org/VegetarianDiet" } : {}),
    offers: { "@type": "Offer", price: price(d.priceCents), priceCurrency: "AUD", availability: d.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };
}

export function menuLd(menu: PublicCategory[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Diwaan Shah Khwaan menu",
    url: `${base()}/menu`,
    inLanguage: "en-AU",
    hasMenuSection: menu.map((c) => ({ "@type": "MenuSection", name: c.name, description: c.description ?? undefined, hasMenuItem: c.dishes.map(itemLd) })),
  };
}

export function dishLd(d: PublicDish) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { ...itemLd(d), "@context": undefined },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Menu", item: `${base()}/menu` },
          { "@type": "ListItem", position: 2, name: d.categoryName, item: `${base()}/menu#${d.categorySlug}` },
          { "@type": "ListItem", position: 3, name: d.name, item: `${base()}/menu/${d.slug}` },
        ],
      },
    ],
  };
}
