import type { Metadata } from "next";
import Link from "next/link";
import { desc, ilike, lt, and } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireStaffPage("audit:view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const before = typeof sp.before === "string" && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : null;
  const s = await getSettings();
  const rows = await getDb()
    .select()
    .from(schema.auditLogs)
    .where(and(q ? ilike(schema.auditLogs.action, `%${q}%`) : undefined, before ? lt(schema.auditLogs.at, before) : undefined))
    .orderBy(desc(schema.auditLogs.at))
    .limit(100);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "medium", timeZone: s.timezone }).format(d);
  return (
    <>
      <AdminHeader title="Audit log" intro="Every sign-in and change made in the dashboard, plus payment issues. Entries can't be edited." />
      <form action="/admin/audit" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filter by action, e.g. refund, menu, staff" aria-label="Filter by action" className="h-10 w-80 rounded-lg border border-line bg-sunken px-3" />
        <button className={buttonClass("ghost", "md")}>Filter</button>
      </form>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2">When</th>
                <th scope="col" className="py-2">Who</th>
                <th scope="col" className="py-2">Action</th>
                <th scope="col" className="py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 align-top">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap py-2 pr-3">{fmt(r.at)}</td>
                  <td className="py-2 pr-3">{r.actorEmail}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.action}</td>
                  <td className="max-w-md break-words py-2 text-xs text-muted">
                    {r.entity}
                    {r.entityId ? ` ${r.entityId.slice(0, 12)}` : ""} {r.details ? JSON.stringify(r.details).slice(0, 300) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 100 ? (
          <Link href={`/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), before: rows[rows.length - 1].at.toISOString() })}`} className="mt-4 inline-block text-sm text-gold underline">
            Older entries
          </Link>
        ) : null}
      </Panel>
    </>
  );
}
