import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { ImageOption } from "@/components/admin/MenuItemForm";

/** Photos the owner can assign to dishes: bundled kitchen photos plus uploads in the media library */
export async function listImageOptions(): Promise<ImageOption[]> {
  let bundled: ImageOption[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "images", "dishes");
    bundled = (await readdir(dir))
      .filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f))
      .sort()
      .map((f) => ({ path: `/images/dishes/${f}`, label: `Kitchen photo: ${f.replace(/\.\w+$/, "").replace(/-/g, " ")}` }));
  } catch {
    /* no bundled photos */
  }
  const uploads = await getDb()
    .select({ id: schema.media.id, filename: schema.media.filename, alt: schema.media.alt })
    .from(schema.media)
    .orderBy(desc(schema.media.createdAt));
  return [...uploads.map((m) => ({ path: `media:${m.id}`, label: `Upload: ${m.alt || m.filename}` })), ...bundled];
}
