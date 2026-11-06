import "server-only";
import type { BusinessSettings, OpeningHours } from "@/lib/db/schema";
import type { PublicCategory, PublicDish } from "./menu";
import { appUrl } from "@/lib/config/app-url";

const base = appUrl;
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const price = (c: number) => (c / 100).toFixed(2);
/** Absolute URL for a site path or an already-absolute (stock photo) URL */
export const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `${base()}${u}`);

/** Suburbs we regularly cook for (pickup from Langford). Used for local search relevance. */
export const AREA_SERVED = ["Langford", "Thornlie", "Beckenham", "Kenwick", "Cannington", "Gosnells", "Maddington", "Wilson", "Lynwood", "Ferndale", "Riverton", "Willetton", "Canning Vale", "Perth"];

/** Optional public profiles (Google Business, Facebook, Instagram…) as comma-separated SOCIAL_LINKS */
export function socialLinks(): string[] {
  return (process.env.SOCIAL_LINKS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/[^\s]+$/.test(s));
}

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
    paymentAccepted: [s.acceptCash ? "Cash" : null, s.acceptCard ? "Credit card, Debit card" : null].filter(Boolean).join(", "),
    areaServed: AREA_SERVED.map((name) => ({ "@type": "Place", name: `${name} WA` })),
    geo: { "@type": "GeoCoordinates", latitude: -32.04, longitude: 115.94 },
    ...(socialLinks().length ? { sameAs: socialLinks() } : {}),
    keywords: `${s.halalCertified ? "halal certified, " : ""}Pakistani food Perth, biryani Langford, karahi, BBQ platters, halal takeaway, home-cooked food Perth`,
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
    ...(d.image ? { image: absUrl(d.image) } : {}),
    ...(d.isVegetarian ? { suitableForDiet: "https://schema.org/VegetarianDiet" } : {}),
    offers: { "@type": "Offer", price: price(d.priceCents), priceCurrency: "AUD", availability: d.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };
}

/** Site-wide WebSite entity, linked to the restaurant */
export function websiteLd(s: BusinessSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base()}/#website`,
    name: s.businessName,
    alternateName: ["DSK", "Diwaan Shah Khwaan Langford"],
    url: base(),
    inLanguage: "en-AU",
    publisher: { "@id": `${base()}/#restaurant` },
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
