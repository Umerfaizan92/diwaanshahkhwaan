import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { adminMenuItem } from "@/lib/server/menu-admin";
import { listImageOptions } from "@/lib/server/images";
import { AdminHeader } from "@/components/admin/ui";
import { MenuItemForm } from "@/components/admin/MenuItemForm";
import { Alert } from "@/components/ui/Field";
import { ALLERGEN_OPTIONS } from "@/lib/domain/allergens";

export const metadata: Metadata = { title: "Edit dish" };

type A = (typeof ALLERGEN_OPTIONS)[number];
const onlyKnown = (xs: string[]) => xs.filter((x): x is A => (ALLERGEN_OPTIONS as readonly string[]).includes(x));

export default async function EditDishPage({ params, searchParams }: PageProps<"/admin/menu/[id]">) {
  await requireStaffPage("menu:edit");
  const { id } = await params;
  const sp = await searchParams;
  const [item, cats, images] = await Promise.all([
    adminMenuItem(id),
    getDb().select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    listImageOptions(),
  ]);
  if (!item) notFound();
  return (
    <>
      <AdminHeader title={item.name} intro={item.isArchived ? "This dish is archived and hidden from the website." : undefined} />
      {sp.created ? (
        <div className="mb-6">
          <Alert tone="success">Dish created.</Alert>
        </div>
      ) : null}
      <MenuItemForm
        categories={cats}
        images={images}
        initial={{
          id: item.id,
          name: item.name,
          slug: item.slug,
          categoryId: item.categoryId,
          shortDescription: item.shortDescription,
          description: item.description,
          portion: item.portion,
          priceCents: item.priceCents,
          imagePath: item.imagePath,
          imageAlt: item.imageAlt,
          isAvailable: item.isAvailable,
          isFeatured: item.isFeatured,
          isDailySpecial: item.isDailySpecial,
          isVegetarian: item.isVegetarian,
          spiceLevel: item.spiceLevel,
          ingredients: item.ingredients,
          allergens: onlyKnown(item.allergens),
          mayContain: onlyKnown(item.mayContain),
          allergensConfirmed: item.allergensConfirmed,
          gstTreatment: item.gstTreatment,
          dailyLimit: item.dailyLimit,
          maxPerOrder: item.maxPerOrder,
          prepLeadHours: item.prepLeadHours,
          availableDays: item.availableDays,
          optionGroups: item.optionGroups.map((g) => ({
            id: g.id,
            name: g.name,
            kind: g.kind,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            choices: g.choices.map((c) => ({ id: c.id, name: c.name, priceDeltaCents: c.priceDeltaCents, isDefault: c.isDefault, isAvailable: c.isAvailable })),
          })),
        }}
      />
    </>
  );
}
