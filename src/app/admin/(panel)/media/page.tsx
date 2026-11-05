import type { Metadata } from "next";
import Image from "next/image";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { MediaDelete, MediaUpload } from "@/components/admin/widgets";

export const metadata: Metadata = { title: "Food photos" };

export default async function MediaPage() {
  await requireStaffPage("menu:edit");
  const db = getDb();
  const items = await db
    .select({ id: schema.media.id, filename: schema.media.filename, alt: schema.media.alt, width: schema.media.width, height: schema.media.height, bytes: schema.media.bytes })
    .from(schema.media)
    .orderBy(desc(schema.media.createdAt));
  const used = await db.select({ name: schema.menuItems.name, path: schema.menuItems.imagePath }).from(schema.menuItems).where(isNotNull(schema.menuItems.imagePath));
  const usedBy = (id: string) => used.filter((u) => u.path === `media:${id}`).map((u) => u.name);
  const [{ missing }] = await db
    .select({ missing: sql<number>`count(*)::int` })
    .from(schema.menuItems)
    .where(and(isNull(schema.menuItems.imagePath), eq(schema.menuItems.isArchived, false)));
  return (
    <>
      <AdminHeader title="Food photos" intro={`Upload your own photos, then choose them on each dish's edit page. ${missing ? `${missing} dishes still show “Photo coming soon”.` : ""}`} />
      <Panel title="Upload a photo" className="mb-6">
        <MediaUpload />
      </Panel>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((m) => (
          <li key={m.id} className="rounded-2xl border border-line bg-raised p-2">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-sunken">
              <Image src={`/api/media/${m.id}`} alt={m.alt} fill sizes="240px" className="object-cover" />
            </div>
            <p className="mt-2 line-clamp-2 text-sm">{m.alt || m.filename}</p>
            <p className="text-xs text-muted">
              {m.width}×{m.height} · {Math.round(m.bytes / 1024)} KB
            </p>
            <p className="text-xs text-muted">{usedBy(m.id).length ? `Used by ${usedBy(m.id).join(", ")}` : "Not used yet"}</p>
            <MediaDelete id={m.id} />
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="text-muted">No uploads yet. Your original kitchen photos are already available to choose on each dish.</p> : null}
    </>
  );
}
