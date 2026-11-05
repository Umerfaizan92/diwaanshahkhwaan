import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { listImageOptions } from "@/lib/server/images";
import { AdminHeader, Empty } from "@/components/admin/ui";
import { MenuItemForm } from "@/components/admin/MenuItemForm";

export const metadata: Metadata = { title: "Add dish" };

export default async function NewDishPage() {
  await requireStaffPage("menu:edit");
  const [cats, images] = await Promise.all([getDb().select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)), listImageOptions()]);
  return (
    <>
      <AdminHeader title="Add dish" />
      {cats.length === 0 ? (
        <Empty>Create a category first.</Empty>
      ) : (
        <MenuItemForm
          categories={cats}
          images={images}
          initial={{
            name: "",
            slug: "",
            categoryId: cats[0].id,
            shortDescription: "",
            description: "",
            portion: null,
            priceCents: 0,
            imagePath: null,
            imageAlt: null,
            isAvailable: true,
            isFeatured: false,
            isDailySpecial: false,
            isVegetarian: false,
            spiceLevel: 0,
            ingredients: null,
            allergens: [],
            mayContain: [],
            allergensConfirmed: false,
            gstTreatment: "TAXABLE",
            dailyLimit: null,
            maxPerOrder: 20,
            prepLeadHours: 0,
            availableDays: [],
            optionGroups: [],
          }}
        />
      )}
    </>
  );
}
