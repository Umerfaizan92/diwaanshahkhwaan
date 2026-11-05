import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/server/auth";
import { can, type Permission } from "@/lib/domain/permissions";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { staffLogout } from "../login/actions";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · DSK Kitchen" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Overview", perm: "dashboard:view" },
  { href: "/admin/menu", label: "Menu", perm: "menu:availability" },
  { href: "/admin/categories", label: "Categories", perm: "menu:edit" },
  { href: "/admin/schedule", label: "Pickup & capacity", perm: "schedule:edit" },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getStaff();
  if (!user) redirect("/admin/login");
  const items = NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }));
  return (
    <div className="lg:flex">
      <AdminNav items={items} user={{ name: user.name, role: user.role.charAt(0) + user.role.slice(1).toLowerCase() }} logout={staffLogout} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
