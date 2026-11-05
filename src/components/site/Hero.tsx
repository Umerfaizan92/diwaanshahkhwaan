"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { buttonClass } from "@/components/ui/Button";

/**
 * Cinematic hero: full-bleed photo with a slow push-in and gentle parallax,
 * and a gold Mughal arch that draws itself once around the wordmark.
 */
export function Hero({ pickupArea, acceptingOrders }: { pickupArea: string; acceptingOrders: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0.2]);

  return (
    <section ref={ref} className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#0d0907] text-[#f2e8d5] lg:items-center">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 9, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src="/images/dishes/bbq-platters-seekh.webp"
            alt="Shahi BBQ platters with seekh kebab, chicken tikka, rice, salad and garlic dip, ready for pickup"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_40%]"
          />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(13_9_7/0.55)_0%,rgb(13_9_7/0.25)_35%,rgb(13_9_7/0.92)_88%)] lg:bg-[linear-gradient(90deg,rgb(13_9_7/0.94)_0%,rgb(13_9_7/0.78)_42%,rgb(13_9_7/0.15)_80%)]" />
      </motion.div>

      <motion.div style={{ opacity: fade }} className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-0">
        <div className="relative max-w-xl">
          {/* The arch: the page's one orchestrated moment */}
          <svg
            viewBox="0 0 400 520"
            className="pointer-events-none absolute -left-6 -top-6 hidden h-[calc(100%+6rem)] w-[calc(100%+3rem)] text-[#c9a24a] sm:block"
            fill="none"
            aria-hidden
            preserveAspectRatio="none"
          >
            <motion.path
              d="M8 516V190C8 118 76 80 124 60c32-13 52-24 76-52 24 28 44 39 76 52 48 20 116 58 116 130v326"
              stroke="currentColor"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
            />
          </svg>

          <motion.p
            className="relative font-display text-sm text-[#e7c873] sm:pl-4 sm:pt-28"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Home-cooked in {pickupArea.replace(/\s*WA.*$/, "")}, Perth
          </motion.p>
          <motion.h1
            className="relative mt-3 font-display text-[2.6rem] font-semibold leading-[1.02] sm:pl-4 sm:text-6xl lg:text-7xl"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="gold-leaf">Diwaan</span>
            <br />
            Shah Khwaan
          </motion.h1>
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="relative sm:pl-4"
          >
            <p className="mt-5 max-w-md text-lg text-[#f2e8d5]/85 sm:text-xl">
              Royal flavours served with love. Biryani, karahi and Shahi BBQ platters, cooked fresh for your order and ready
              when you arrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 pb-2 sm:pb-12">
              <Link href="/menu" className={buttonClass("gold", "lg")}>
                {acceptingOrders ? "Order for pickup" : "See the menu"}
              </Link>
              <Link href="/order-ahead" className={buttonClass("outline", "lg", "border-[#c9a24a]/60 text-[#f2e8d5] hover:bg-[#c9a24a]/10")}>
                How ordering works
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
