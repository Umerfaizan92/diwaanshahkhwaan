import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { categoryItemCounts } from "@/lib/server/menu-admin";
import { AdminHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaffPage("menu:edit");
  const cats = await getDb().select().from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  const counts = await categoryItemCounts(cats.map((c) => c.id));
  return (
    <>
      <AdminHeader title="Categories" intro="Order and name the sections of your menu. Hidden categories (and their dishes) don't appear on the website." />
      <CategoryManager categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, isVisible: c.isVisible, count: counts.get(c.id) ?? 0 }))} />
    </>
  );
}
