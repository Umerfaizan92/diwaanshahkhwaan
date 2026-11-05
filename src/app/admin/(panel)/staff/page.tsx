import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StaffCreate, StaffRow } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Owner login" };

export default async function StaffPage() {
  const me = await requireStaffPage("staff:manage");
  const s = await getSettings();
  const staff = await getDb().select().from(schema.staffUsers).orderBy(asc(schema.staffUsers.name));
  const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(d) : null);
  return (
    <>
      <AdminHeader title="Owner login" intro="Only the business owner can sign in to this dashboard. Change your password here, or add a second owner login (for example a partner). Nobody else has access." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Owner logins">
          <ul className="divide-y divide-line/70">
            {staff.map((u) => (
              <StaffRow key={u.id} isMe={u.id === me.id} u={{ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, lastLoginAt: fmt(u.lastLoginAt) }} />
            ))}
          </ul>
        </Panel>
        <div className="space-y-6">
          <Panel title="Add another owner login">
            <StaffCreate />
          </Panel>
        </div>
      </div>
    </>
  );
}
