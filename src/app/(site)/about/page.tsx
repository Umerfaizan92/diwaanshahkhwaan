import type { Metadata } from "next";
import Image from "next/image";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About our kitchen",
  description: "Diwaan Shah Khwaan is a home kitchen in Langford WA cooking Pakistani and Mughlai favourites to order.",
  alternates: { canonical: "/about" },
};

const GALLERY = [
  { src: "/images/dishes/chicken-tikka-grill.webp", alt: "Rows of chicken tikka skewers on the grill", cls: "col-span-2 aspect-[16/10]" },
  { src: "/images/dishes/biryani-tray-2.webp", alt: "Chicken biryani in foil trays", cls: "aspect-[3/4]" },
  { src: "/images/dishes/mixed-grill.webp", alt: "Malai and red tikka pieces grilling", cls: "aspect-[3/4]" },
  { src: "/images/dishes/biryani-karahi-spread.webp", alt: "Biryani and karahi packed in takeaway containers", cls: "col-span-2 aspect-[16/10]" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About our kitchen" intro="Royal flavours served with love — cooked at home, in Langford." />
      <Container className="grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="max-w-prose space-y-5 text-lg text-text/90">
          <p>
            Diwaan Shah Khwaan — DSK — is a home kitchen cooking the Pakistani and Mughlai dishes we grew up with and serve at
            our own celebrations: layered biryani, karahi finished to order, slow-cooked haandi curries and Shahi BBQ.
          </p>
          <p>
            A <em>diwaan</em> is a royal court, and a <em>khwaan</em> is a laden table. That&apos;s the idea: generous food,
            made with care, that turns any meal into an occasion.
          </p>
          <p>
            Because we cook in small batches, we take orders ahead. That lets us buy fresh for what&apos;s ordered, cook it fresh
            for your pickup, and have it packed and ready when you arrive.
          </p>
          <h2 className="pt-4 font-display text-2xl">Gatherings and bulk orders</h2>
          <p>
            We take large BBQ and bulk orders for gatherings. Choose your chicken tikka, seekh kebab, and beef or lamb tikka
            and quantities, and we&apos;ll put together a feast for your occasion.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href="/menu">See the menu</ButtonLink>
            <ButtonLink href="/contact?topic=bulk" variant="outline">
              Ask about a bulk order
            </ButtonLink>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3" aria-label="From our kitchen">
          {GALLERY.map((g) => (
            <li key={g.src} className={`relative overflow-hidden rounded-2xl ${g.cls}`}>
              <Image src={g.src} alt={g.alt} fill sizes="(min-width:1024px) 26vw, 46vw" className="object-cover" />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
