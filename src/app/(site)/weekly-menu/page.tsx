import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { DAY_NAMES, formatTime12 } from "@/lib/domain/hours";
import { formatCentsShort } from "@/lib/domain/money";
import { getPublicMenu } from "@/lib/server/menu";
import { getOpeningHours } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Weekly menu",
  description: "What's available to order for each day of the week at Diwaan Shah Khwaan.",
  alternates: { canonical: "/weekly-menu" },
};

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default async function WeeklyMenuPage() {
  const [menu, hours] = await Promise.all([getPublicMenu(), getOpeningHours()]);
  const dishes = menu.flatMap((c) => c.dishes).filter((d) => d.isAvailable);
  const everyDay = dishes.filter((d) => d.availableDays.length === 0);

  return (
    <>
      <PageHeader title="Weekly menu" intro="Most dishes can be ordered for any day we're open. Some are only cooked on certain days." />
      <Container className="py-12">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {WEEK.map((day) => {
            const h = hours.find((x) => x.dayOfWeek === day);
            const open = h?.isOpen ?? false;
            const dayOnly = dishes.filter((d) => d.availableDays.includes(day));
            return (
              <li key={day} className={`rounded-3xl border p-5 ${open ? "border-line bg-raised" : "border-line/50 bg-transparent"}`}>
                <h2 className="font-display text-xl">{DAY_NAMES[day]}</h2>
                <p className={`text-sm ${open ? "text-muted" : "text-danger"}`}>
                  {open && h ? `Pickup ${formatTime12(h.openTime)}–${formatTime12(h.closeTime)}` : "Closed"}
                </p>
                {open ? (
                  <>
                    {dayOnly.length ? (
                      <ul className="mt-4 space-y-1.5">
                        {dayOnly.map((d) => (
                          <li key={d.id} className="flex justify-between gap-3">
                            <Link href={`/menu/${d.slug}`} className="hover:text-gold">
                              {d.name}
                            </Link>
                            <span className="text-gold">{formatCentsShort(d.priceCents)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-4 text-sm text-muted">
                      {dayOnly.length ? "Plus" : "All"} {everyDay.length} everyday dishes.
                    </p>
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-12">
          <h2 className="font-display text-2xl">Available every day we&apos;re open</h2>
          <ul className="mt-5 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {everyDay.map((d) => (
              <li key={d.id} className="flex justify-between gap-3 border-b border-line/50 py-2">
                <Link href={`/menu/${d.slug}`} className="hover:text-gold">
                  {d.name}
                </Link>
                <span className="text-gold">{formatCentsShort(d.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </>
  );
}
