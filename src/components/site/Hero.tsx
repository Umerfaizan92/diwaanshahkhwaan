import Link from "next/link";
import { HeroParallax } from "./HeroParallax";

/** Real photos from the kitchen, cross-faded with a slow cinematic push-in. */
const SLIDES = [
  { src: "/images/dishes/bbq-platters-seekh.webp", alt: "Shahi BBQ platters with seekh kebab, chicken tikka, rice, salad and garlic dip", pos: "50% 40%" },
  { src: "/images/dishes/biryani-karahi-spread.webp", alt: "A spread of chicken biryani and karahi", pos: "50% 50%" },
  { src: "/images/dishes/mixed-grill.webp", alt: "Mixed grill with tikka and kebabs", pos: "50% 45%" },
  { src: "/images/dishes/chicken-karahi.webp", alt: "Chicken karahi with ginger and green chilli", pos: "50% 50%" },
  { src: "/images/dishes/biryani-trays.webp", alt: "Trays of chicken biryani ready for pickup", pos: "50% 50%" },
  { src: "/images/dishes/bbq-platter-boti.webp", alt: "BBQ platter with chicken boti", pos: "50% 50%" },
];
const SLIDE_SECONDS = 6;

/**
 * Cinematic hero, rendered on the server with CSS-only motion. The hero always uses the dark
 * palette (`on-dark`) because it sits on photography, so text stays readable in light mode too.
 */
export function Hero({ pickupArea, acceptingOrders }: { pickupArea: string; acceptingOrders: boolean }) {
  return (
    <section className="on-dark grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#0d0907] text-[#f7efe0] lg:items-center">
      <HeroParallax />
      <div className="parallax absolute inset-0 -z-10" style={{ ["--slides" as string]: SLIDES.length, ["--slide-s" as string]: `${SLIDE_SECONDS}s` }}>
        {SLIDES.map((s, i) => (
          <div key={s.src} className="hero-slide absolute inset-0" style={{ animationDelay: `${i * SLIDE_SECONDS - 1.5}s` }} aria-hidden={i > 0 || undefined}>
            {/* Plain responsive <img>: phones get the 720px file, larger screens the 1200–1600px one */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              srcSet={`${s.src.replace("/dishes/", "/dishes/sm/")} 720w, ${s.src} 1600w`}
              sizes="100vw"
              alt={i === 0 ? s.alt : ""}
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i < 2 ? "eager" : "lazy"}
              decoding={i === 0 ? "sync" : "async"}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: s.pos }}
            />
          </div>
        ))}
        {/* Strong scrim so text passes contrast on every photo */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(10_7_5/0.72)_0%,rgb(10_7_5/0.45)_30%,rgb(10_7_5/0.82)_62%,rgb(10_7_5/0.96)_100%)] lg:bg-[linear-gradient(90deg,rgb(10_7_5/0.95)_0%,rgb(10_7_5/0.84)_40%,rgb(10_7_5/0.35)_75%,rgb(10_7_5/0.2)_100%)]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-0">
        <div className="relative max-w-xl">
          <svg viewBox="0 0 400 520" className="pointer-events-none absolute -left-6 -top-6 hidden h-[calc(100%+6rem)] w-[calc(100%+3rem)] text-[#d9b45a] sm:block" fill="none" aria-hidden preserveAspectRatio="none">
            <path className="arch-draw" pathLength={1} d="M8 516V190C8 118 76 80 124 60c32-13 52-24 76-52 24 28 44 39 76 52 48 20 116 58 116 130v326" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="hero-shadow fade-in relative font-display text-[clamp(0.85rem,2.6vw,1rem)] font-semibold tracking-wide text-[#f3d68a] [animation-delay:0.5s] sm:pl-4 sm:pt-28">
            Home-cooked in {pickupArea.replace(/\s*WA.*$/, "")}, Perth
          </p>
          <h1 className="hero-shadow rise relative mt-3 font-display text-[clamp(2.4rem,9vw,4.75rem)] font-semibold leading-[1.02] text-[#fbf4e6] [animation-delay:0.2s] sm:pl-4">
            <span className="gold-leaf">Diwaan</span>
            <br />
            Shah Khwaan
          </h1>
          <div className="rise relative [animation-delay:0.35s] sm:pl-4">
            <p className="hero-shadow mt-5 max-w-md text-[clamp(1rem,3.6vw,1.25rem)] text-[#f7efe0]">
              Royal flavours served with love. Biryani, karahi and Shahi BBQ platters, cooked fresh for your order and ready when you arrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 pb-2 sm:pb-12">
              <Link
                href="/menu"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#e2bd5e] px-6 text-base font-semibold text-[#1a1209] shadow-[0_10px_30px_-12px_#e2bd5e] transition-colors hover:bg-[#f0d07a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d68a]"
              >
                {acceptingOrders ? "Order for pickup" : "See the menu"}
              </Link>
              <Link
                href="/order-ahead"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#f3d68a]/80 bg-black/40 px-6 text-base font-semibold text-[#fbf4e6] backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d68a]"
              >
                How ordering works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
