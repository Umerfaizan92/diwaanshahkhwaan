import Link from "next/link";
import { formatCentsShort } from "@/lib/domain/money";
import { HandiIcon } from "./Emblem";

export type CategoryTile = { slug: string; name: string; description: string | null; count: number; fromCents: number; image: string | null };

/** Menu at a glance: one photo tile per category, linking to that section of the full menu */
export function MenuCategories({ categories }: { categories: CategoryTile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((c, i) => {
        // An odd one out on phones spans the full width as a wide banner
        const wide = i === categories.length - 1 && categories.length % 2 === 1;
        return (
        <li key={c.slug} className={wide ? "col-span-2 md:col-span-1" : ""}>
          <Link
            href={`/menu#${c.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold/25 bg-raised transition-colors hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {/* Photo fills its own landscape frame edge to edge, text sits below it */}
            <span className="relative block aspect-[16/10] overflow-hidden bg-sunken">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105" />
              ) : (
                <HandiIcon className="absolute left-1/2 top-1/2 w-1/4 -translate-x-1/2 -translate-y-1/2 text-gold/50" />
              )}
            </span>
            <span className="flex flex-1 flex-col p-3.5 sm:p-5">
              <span className="block font-display text-[clamp(0.95rem,4vw,1.25rem)] font-semibold leading-tight text-text">{c.name}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.8rem] text-muted sm:text-sm">
                <span>{c.count} {c.count === 1 ? "dish" : "dishes"}</span>
                <span aria-hidden className="text-gold">•</span>
                <span>from {formatCentsShort(c.fromCents)}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-gold group-hover:underline">
                View dishes <span aria-hidden>→</span>
              </span>
            </span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
