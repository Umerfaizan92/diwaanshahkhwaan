import Image from "next/image";
import Link from "next/link";
import { HeroParallax } from "./HeroParallax";
import { HalalSeal } from "./HalalSeal";
import { HeroDishRotator, type RotatorDish } from "./HeroDishRotator";

/** Real photos from the kitchen, cross-faded with a slow cinematic push-in. */
const SLIDES = [
  { src: "/images/dishes/royal-menu-collage.webp", alt: "Royal collection of our dishes in brass bowls: korma, degi, butter chicken, karahi, biryani and more", pos: "50% 50%" },
  { src: "/images/dishes/bbq-platters-seekh.webp", alt: "Shahi BBQ platters with seekh kebab, chicken tikka, rice, salad and garlic dip", pos: "50% 40%" },
  { src: "/images/dishes/biryani-karahi-spread.webp", alt: "A spread of chicken biryani and karahi", pos: "50% 50%" },
  { src: "/images/dishes/mixed-grill.webp", alt: "Mixed grill with tikka and kebabs", pos: "50% 45%" },
  { src: "/images/dishes/chicken-karahi.webp", alt: "Chicken karahi with ginger and green chilli", pos: "50% 50%" },
  { src: "/images/dishes/biryani-trays.webp", alt: "Trays of chicken biryani ready for pickup", pos: "50% 50%" },
  { src: "/images/dishes/bbq-platter-boti.webp", alt: "BBQ platter with chicken boti", pos: "50% 50%" },
];
const SLIDE_SECONDS = 4;

/**
 * Cinematic hero, rendered on the server with CSS-only motion. The hero always uses the dark
 * palette (`on-dark`) because it sits on photography, so text stays readable in light mode too.
 */
export function Hero({ pickupArea, acceptingOrders, halal = false, dishes = [] }: { pickupArea: string; acceptingOrders: boolean; halal?: boolean; dishes?: RotatorDish[] }) {
  return (
    <section className="on-dark grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#0d0907] text-[#f7efe0] lg:items-center">
      <HeroParallax />
      <div className="parallax absolute inset-0 -z-10" style={{ ["--slides" as string]: SLIDES.length, ["--slide-s" as string]: `${SLIDE_SECONDS}s` }}>
        {SLIDES.map((s, i) => (
          <div key={s.src} className="hero-slide absolute inset-0" style={{ animationDelay: `${i * SLIDE_SECONDS - 0.4}s` }} aria-hidden={i > 0 || undefined}>
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

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:pb-0 lg:pt-28">
        {/* Gold Mughal arch framing the wordmark: drawn inside the content box so nothing spills off-screen */}
        <div className="relative w-full max-w-xl">
          {/* Crown of the arch has a fixed height, so the wording always sits below its curve on every screen */}
          <svg viewBox="0 0 400 144" className="pointer-events-none absolute inset-x-0 top-0 h-32 w-full text-[#d9b45a] sm:h-36" fill="none" aria-hidden preserveAspectRatio="none">
            <path className="arch-draw" pathLength={1} d="M1 144C1 92 64 68 120 52 160 40 184 28 200 3c16 25 40 37 80 49 56 16 119 40 119 92" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </svg>
          <div aria-hidden className="fade-in pointer-events-none absolute inset-x-0 bottom-0 top-32 border-x border-[#d9b45a]/90 [animation-delay:0.8s] sm:top-36" />

          {/* Logo at the crown of the arch, with steam rising from the handi */}
          <div className="fade-in absolute left-1/2 top-[2.6rem] -translate-x-1/2 [animation-delay:0.6s] sm:top-[2.9rem]">
            <div className="smoke" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
            <Image src="/images/brand/emblem.png" alt="" width={84} height={84} priority className="relative size-16 rounded-full shadow-[0_0_28px_-4px_rgb(226_189_94/0.55)] ring-1 ring-[#d9b45a]/70 sm:size-20" />
          </div>

          <div className="relative px-5 pb-8 pt-[9.25rem] sm:px-9 sm:pb-12 sm:pt-[10.5rem]">
            <p className="hero-shadow fade-in font-display text-[clamp(0.8rem,3.4vw,1rem)] font-semibold tracking-wide text-[#f3d68a] [animation-delay:0.5s]">
              Home-cooked in {pickupArea.replace(/\s*WA.*$/, "")}, Perth
            </p>
            <h1 className="hero-shadow rise mt-3 font-display text-[clamp(2.1rem,10vw,4.75rem)] font-semibold leading-[1.02] text-[#fbf4e6] [animation-delay:0.2s]">
              <span className="gold-leaf">Diwaan</span>
              <br />
              Shah Khwaan
            </h1>
            <div className="rise [animation-delay:0.35s]">
              <p className="hero-shadow mt-5 max-w-md text-[clamp(0.98rem,3.8vw,1.25rem)] text-[#f7efe0]">
                Royal flavours served with love. Biryani, karahi and Shahi BBQ platters, cooked fresh for your order and ready when you arrive.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <Link
                  href="/menu"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#e2bd5e] px-2 text-center text-[clamp(0.82rem,3.6vw,0.95rem)] leading-tight sm:w-auto sm:min-w-[13rem] sm:px-6 sm:text-base font-semibold text-[#1a1209] shadow-[0_10px_30px_-12px_#e2bd5e] transition-colors hover:bg-[#f0d07a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d68a]"
                >
                  {acceptingOrders ? "Order for pickup" : "See the menu"}
                </Link>
                <Link
                  href="/order-ahead"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#f3d68a]/80 bg-black/40 px-2 text-center text-[clamp(0.82rem,3.6vw,0.95rem)] leading-tight sm:w-auto sm:min-w-[13rem] sm:px-6 sm:text-base font-semibold text-[#fbf4e6] backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d68a]"
                >
                  How ordering works
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Desktop: fast dish carousel beside the arch, with the Halal seal on its corner */}
        <div className="pop-up absolute right-[5%] top-1/2 hidden w-[min(30vw,25rem)] -translate-y-1/2 [animation-delay:0.7s] lg:block">
          <HeroDishRotator dishes={dishes} />
          {halal ? (
            <div className="halal-glow absolute -right-8 -top-12 rounded-full">
              <HalalSeal className="size-32 drop-shadow-[0_12px_30px_rgb(0_0_0/0.6)] xl:size-36" />
            </div>
          ) : null}
        </div>
        {/* Phones and tablets: the dish carousel sits above the arch when there's room */}
        <div className="pop-up absolute left-1/2 top-[4.5rem] hidden w-[min(72vw,19rem)] -translate-x-1/2 [animation-delay:0.7s] [@media(min-height:800px)]:block sm:w-[22rem] lg:!hidden">
          <HeroDishRotator dishes={dishes} />
        </div>
        {halal ? (
          <div className="pop-up absolute right-3 top-[4.25rem] [animation-delay:0.9s] sm:right-6 lg:hidden">
            <HalalSeal className="size-16 drop-shadow-[0_8px_20px_rgb(0_0_0/0.6)] sm:size-20" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
