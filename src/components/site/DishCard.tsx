import Link from "next/link";
import { DishImage } from "./DishImage";
import { formatCentsShort } from "@/lib/domain/money";
import { cardImage } from "@/lib/domain/images";
import type { PublicDish } from "@/lib/server/menu";

export function SpiceMeter({ level }: { level: number }) {
  if (level <= 0) return null;
  const label = ["", "Mild", "Medium", "Hot"][Math.min(level, 3)];
  return (
    <span className="relative inline-flex items-center gap-1 text-xs text-muted" title={`Spice: ${label}`}>
      <span className="sr-only">Spice: {label}</span>
      {[1, 2, 3].map((n) => (
        <svg key={n} viewBox="0 0 12 16" className={`h-3.5 w-2.5 ${n <= level ? "text-maroon-bright" : "text-line"}`} aria-hidden>
          <path d="M6 1c0 2 2 2 2 4 3 2 3 6 0 9-1 1-3 1-4 0-3-3-3-7 0-9 0-2 2-2 2-4Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

export function DishTags({ dish }: { dish: Pick<PublicDish, "isVegetarian" | "isDailySpecial" | "isAvailable"> & { isMostLoved?: boolean } }) {
  return (
    <>
      {dish.isMostLoved && dish.isAvailable && (
        <span className="rounded-full bg-[#e2bd5e] px-2 py-0.5 text-xs font-semibold text-[#1a1209]">
          <span aria-hidden>♥ </span>Most loved
        </span>
      )}
      {!dish.isAvailable && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">Sold out</span>}
      {dish.isDailySpecial && <span className="rounded-full bg-maroon px-2 py-0.5 text-xs font-semibold text-[#f6e7cf]">Special</span>}
      {dish.isVegetarian && <span className="rounded-full border border-success/50 bg-bg/90 px-2 py-0.5 text-xs font-medium text-success">Vegetarian</span>}
    </>
  );
}

/** Dish card: arch-topped photo and the essentials. The whole card is one link. */
export function DishCard({ dish, priority = false, sizes = "(min-width:1024px) 22vw, (min-width:640px) 40vw, 80vw" }: { dish: PublicDish; priority?: boolean; sizes?: string }) {
  return (
    <Link
      href={`/menu/${dish.slug}`}
      className="group relative flex h-full flex-col rounded-[1.4rem] p-2 transition-colors hover:bg-raised focus-visible:bg-raised"
    >
      <div className="relative">
        <DishImage
          src={cardImage(dish.image)}
          alt={dish.imageAlt}
          name={dish.name}
          sizes={sizes}
          priority={priority}
          className={`aspect-[4/5] w-full transition-transform duration-500 ease-out group-hover:scale-[1.015] ${dish.isAvailable ? "" : "opacity-60 grayscale"}`}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <DishTags dish={dish} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <h3 className="font-display text-[0.98rem] leading-snug group-hover:text-gold sm:text-[1.08rem]">{dish.name}</h3>
          <span className="shrink-0 font-display text-lg text-gold">{formatCentsShort(dish.priceCents)}</span>
        </div>
        <p className="mt-1 text-[0.95rem] leading-snug text-muted">{dish.shortDescription}</p>
        <div className="mt-auto flex items-center gap-3 pt-3">
          <SpiceMeter level={dish.spiceLevel} />
          {dish.portion ? <span className="text-xs text-muted">{dish.portion}</span> : null}
        </div>
      </div>
    </Link>
  );
}
