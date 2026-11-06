import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/server/auth";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { can, type Permission } from "@/lib/domain/permissions";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { staffLogout } from "../login/actions";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · DSK Owner" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Overview", perm: "dashboard:view" },
  { href: "/admin/orders", label: "Orders", perm: "orders:view" },
  { href: "/admin/production", label: "Kitchen schedule", perm: "production:view" },
  { href: "/admin/menu", label: "Menu", perm: "menu:availability" },
  { href: "/admin/categories", label: "Categories", perm: "menu:edit" },
  { href: "/admin/media", label: "Food photos", perm: "menu:edit" },
  { href: "/admin/schedule", label: "Pickup & capacity", perm: "schedule:edit" },
  { href: "/admin/payments", label: "Payments", perm: "payments:view" },
  { href: "/admin/customers", label: "Customers", perm: "customers:view" },
  { href: "/admin/reports", label: "Sales reports", perm: "reports:view" },
  { href: "/admin/messages", label: "Messages", perm: "messages:view" },
  { href: "/admin/notifications", label: "Notifications", perm: "notifications:manage" },
  { href: "/admin/settings", label: "Settings", perm: "settings:edit" },
  { href: "/admin/staff", label: "Owner login", perm: "staff:manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:view" },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getStaff();
  if (!user) redirect("/admin/login");
  const [counts] = await getDb()
    .select({
      newOrders: sql<number>`(select count(*)::int from orders where status = 'NEW')`,
      attention: sql<number>`(select count(*)::int from orders where attention_reason is not null)`,
      messages: sql<number>`(select count(*)::int from contact_messages where handled = false)`,
      failedJobs: sql<number>`(select count(*)::int from notification_jobs where status = 'FAILED')`,
    })
    .from(sql`(select 1) x`);
  const badges: Record<string, number> = { "/admin/orders": counts.newOrders + counts.attention, "/admin/messages": counts.messages, "/admin/notifications": counts.failedJobs };
  const items = NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label, badge: badges[href] || undefined }));
  return (
    <div className="lg:flex">
      <AdminNav items={items} user={{ name: user.name, role: user.role.charAt(0) + user.role.slice(1).toLowerCase() }} logout={staffLogout} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
