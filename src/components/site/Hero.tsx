import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { HeroParallax } from "./HeroParallax";

/**
 * Cinematic hero, rendered on the server with CSS-only motion: a slow push-in on the photo,
 * gentle parallax, and a gold Mughal arch that draws itself once around the wordmark.
 */
export function Hero({ pickupArea, acceptingOrders }: { pickupArea: string; acceptingOrders: boolean }) {
  return (
    <section className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#0d0907] text-[#f2e8d5] lg:items-center">
      <HeroParallax />
      <div className="parallax absolute inset-0 -z-10">
        <div className="hero-push absolute inset-0">
          <Image
            src="/images/dishes/bbq-platters-seekh.webp"
            alt="Shahi BBQ platters with seekh kebab, chicken tikka, rice, salad and garlic dip, ready for pickup"
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            quality={70}
            className="object-cover object-[50%_40%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(13_9_7/0.55)_0%,rgb(13_9_7/0.25)_35%,rgb(13_9_7/0.92)_88%)] lg:bg-[linear-gradient(90deg,rgb(13_9_7/0.94)_0%,rgb(13_9_7/0.78)_42%,rgb(13_9_7/0.15)_80%)]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-0">
        <div className="relative max-w-xl">
          <svg viewBox="0 0 400 520" className="pointer-events-none absolute -left-6 -top-6 hidden h-[calc(100%+6rem)] w-[calc(100%+3rem)] text-[#c9a24a] sm:block" fill="none" aria-hidden preserveAspectRatio="none">
            <path className="arch-draw" pathLength={1} d="M8 516V190C8 118 76 80 124 60c32-13 52-24 76-52 24 28 44 39 76 52 48 20 116 58 116 130v326" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="fade-in relative font-display text-sm text-[#e7c873] [animation-delay:0.5s] sm:pl-4 sm:pt-28">Home-cooked in {pickupArea.replace(/\s*WA.*$/, "")}, Perth</p>
          <h1 className="rise relative mt-3 font-display text-[2.6rem] font-semibold leading-[1.02] [animation-delay:0.2s] sm:pl-4 sm:text-6xl lg:text-7xl">
            <span className="gold-leaf">Diwaan</span>
            <br />
            Shah Khwaan
          </h1>
          <div className="rise relative [animation-delay:0.35s] sm:pl-4">
            <p className="mt-5 max-w-md text-lg text-[#f2e8d5]/85 sm:text-xl">Royal flavours served with love. Biryani, karahi and Shahi BBQ platters, cooked fresh for your order and ready when you arrive.</p>
            <div className="mt-8 flex flex-wrap gap-3 pb-2 sm:pb-12">
              <Link href="/menu" className={buttonClass("gold", "lg")}>
                {acceptingOrders ? "Order for pickup" : "See the menu"}
              </Link>
              <Link href="/order-ahead" className={buttonClass("outline", "lg", "border-[#c9a24a]/60 text-[#f2e8d5] hover:bg-[#c9a24a]/10")}>
                How ordering works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
