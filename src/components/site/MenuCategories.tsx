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
            className={`group relative flex ${wide ? "aspect-[16/9] md:aspect-[4/5]" : "aspect-[4/5]"} h-full flex-col justify-end overflow-hidden rounded-2xl border border-gold/25 bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
          >
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
            ) : (
              <HandiIcon className="absolute left-1/2 top-[30%] w-1/3 -translate-x-1/2 -translate-y-1/2 text-gold/50" />
            )}
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgb(10_7_5/0.55)_55%,rgb(10_7_5/0.95)_100%)]" />
            <span className="relative p-3.5 sm:p-5">
              <span className="block font-display text-[clamp(1rem,4.2vw,1.3rem)] font-semibold leading-tight text-[#fbf4e6]">{c.name}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.8rem] text-[#e9dcc4] sm:text-sm">
                <span>{c.count} {c.count === 1 ? "dish" : "dishes"}</span>
                <span aria-hidden className="text-[#d9b45a]">•</span>
                <span>from {formatCentsShort(c.fromCents)}</span>
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#f0d07a] group-hover:underline">
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
