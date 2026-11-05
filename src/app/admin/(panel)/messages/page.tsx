import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { toTelHref } from "@/lib/config/business";
import { AdminHeader, Badge, Empty } from "@/components/admin/ui";
import { HandledToggle } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireStaffPage("messages:view");
  const s = await getSettings();
  const rows = await getDb().select().from(schema.contactMessages).orderBy(schema.contactMessages.handled, desc(schema.contactMessages.createdAt)).limit(200);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(d);
  return (
    <>
      <AdminHeader title="Messages" intro="Enquiries from the website contact form, including bulk and BBQ requests." />
      {rows.length === 0 ? <Empty>No messages yet.</Empty> : null}
      <ul className="space-y-3">
        {rows.map((m) => (
          <li key={m.id} className={`rounded-2xl border bg-raised p-5 ${m.handled ? "border-line opacity-70" : "border-gold/50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {m.name} {!m.handled ? <Badge tone="gold">New</Badge> : null}
                </p>
                <p className="text-sm text-muted">
                  {fmt(m.createdAt)} ·{" "}
                  <a href={`mailto:${m.email}`} className="underline">
                    {m.email}
                  </a>
                  {m.phone ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={toTelHref(m.phone)} className="underline">
                        {m.phone}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <HandledToggle id={m.id} handled={m.handled} />
            </div>
            <p className="mt-3 whitespace-pre-line">{m.message}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
