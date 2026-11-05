import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/server/auth";
import { customerList } from "@/lib/server/admin-misc";
import { formatCents } from "@/lib/domain/money";
import { formatDateShort } from "@/lib/domain/time";
import { AdminHeader, Badge, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaffPage("customers:view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const list = await customerList(q);
  return (
    <>
      <AdminHeader title="Customers" intro="Everyone who has placed a paid order." />
      <form action="/admin/customers" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search customers" className="h-10 w-72 rounded-lg border border-line bg-sunken px-3" />
        <button className={buttonClass("ghost", "md")}>Search</button>
      </form>
      <Panel>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2">Customer</th>
                <th scope="col" className="py-2">Phone</th>
                <th scope="col" className="py-2 text-right">Orders</th>
                <th scope="col" className="py-2 text-right">Spent</th>
                <th scope="col" className="py-2 text-right">Last pickup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {list.map((c) => (
                <tr key={c.email}>
                  <td className="py-2">
                    <Link href={`/admin/customers/${encodeURIComponent(c.email)}`} className="font-semibold hover:text-gold">
                      {c.name}
                    </Link>{" "}
                    {c.hasAccount ? <Badge tone="gold">Account</Badge> : null}
                    <span className="block text-xs text-muted">{c.email}</span>
                  </td>
                  <td className="py-2">{c.phone}</td>
                  <td className="py-2 text-right tabular-nums">{c.orders}</td>
                  <td className="py-2 text-right tabular-nums">{formatCents(c.spent)}</td>
                  <td className="py-2 text-right">{formatDateShort(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 ? <p className="py-8 text-center text-muted">No customers yet.</p> : null}
        </div>
      </Panel>
    </>
  );
}
