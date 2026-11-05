import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { adminMenu } from "@/lib/server/menu-admin";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const user = await requireStaffPage("dashboard:view");
  const sp = await searchParams;
  const menu = await adminMenu();
  const items = menu.flatMap((c) => c.items).filter((i) => !i.isArchived);
  return (
    <>
      <AdminHeader title={`Hello, ${user.name}`} />
      {sp.denied ? <p role="alert" className="mb-4 rounded-xl border border-danger/50 bg-danger/10 px-4 py-3">You don&apos;t have access to that page.</p> : null}
      <Panel title="Menu">
        <p>
          {items.length} dishes on the menu, {items.filter((i) => !i.isAvailable).length} sold out, {items.filter((i) => !i.allergensConfirmed).length} with allergens still to confirm.
        </p>
        <Link href="/admin/menu" className="mt-3 inline-block font-semibold text-gold underline">
          Manage menu
        </Link>
      </Panel>
    </>
  );
}
