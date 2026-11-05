import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { adminMenu } from "@/lib/server/menu-admin";
import { can } from "@/lib/domain/permissions";
import { AdminHeader, Empty } from "@/components/admin/ui";
import { MenuRow } from "@/components/admin/MenuRow";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: PageProps<"/admin/menu">) {
  const user = await requireStaffPage("menu:availability");
  const canEdit = can(user.role, "menu:edit");
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const menu = await adminMenu();
  const total = menu.reduce((n, c) => n + c.items.filter((i) => !i.isArchived).length, 0);
  const soldOut = menu.reduce((n, c) => n + c.items.filter((i) => !i.isArchived && !i.isAvailable).length, 0);

  return (
    <>
      <AdminHeader
        title="Menu"
        intro={
          <>
            {total} dishes{soldOut ? `, ${soldOut} sold out` : ""}. Change names, prices, photos and availability here: changes appear on the website straight away.
          </>
        }
        actions={
          <>
            <Link href={showArchived ? "/admin/menu" : "/admin/menu?archived=1"} className={buttonClass("ghost", "sm")}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Link>
            {canEdit ? (
              <Link href="/admin/menu/new" className={buttonClass("gold", "sm")}>
                Add dish
              </Link>
            ) : null}
          </>
        }
      />
      {menu.length === 0 ? <Empty>No categories yet. Create a category first, then add dishes to it.</Empty> : null}
      <div className="space-y-6">
        {menu.map((c) => {
          const items = c.items.filter((i) => showArchived || !i.isArchived);
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`} className="rounded-2xl border border-line bg-raised px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h2 id={`cat-${c.id}`} className="font-display text-lg">
                  {c.name} {!c.isVisible ? <span className="text-sm font-normal text-warning">(hidden from site)</span> : null}
                </h2>
                <span className="text-sm text-muted">{items.length} dishes</span>
              </div>
              {items.length ? (
                <ul className="divide-y divide-line/70">
                  {items.map((i, idx) => (
                    <MenuRow key={i.id} item={i} canEdit={canEdit} first={idx === 0} last={idx === items.length - 1} />
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted">No dishes in this category.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
