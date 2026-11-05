import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { getSettings } from "@/lib/server/settings";
import { ROLE_LABEL, ROLES } from "@/lib/domain/permissions";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StaffCreate, StaffRow } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaffPage("staff:manage");
  const s = await getSettings();
  const staff = await getDb().select().from(schema.staffUsers).orderBy(asc(schema.staffUsers.name));
  const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(d) : null);
  return (
    <>
      <AdminHeader title="Staff & permissions" intro="Who can sign in to the dashboard and what they can do. Changes take effect immediately." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Team">
          <ul className="divide-y divide-line/70">
            {staff.map((u) => (
              <StaffRow key={u.id} isMe={u.id === me.id} u={{ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, lastLoginAt: fmt(u.lastLoginAt) }} />
            ))}
          </ul>
        </Panel>
        <div className="space-y-6">
          <Panel title="Add a staff member">
            <StaffCreate />
          </Panel>
          <Panel title="Roles">
            <ul className="space-y-2 text-sm">
              {ROLES.map((r) => (
                <li key={r}>{ROLE_LABEL[r]}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
