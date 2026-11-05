import "server-only";
import { inArray } from "drizzle-orm";
import { schema, type DbOrTx } from "@/lib/db";
import type { CatalogItem } from "@/lib/domain/pricing";

/** Loads the authoritative pricing catalogue for the given dish ids */
export async function loadCatalog(db: DbOrTx, ids: string[]): Promise<Map<string, CatalogItem & { prepLeadHours: number; dailyLimit: number | null; availableDays: number[] }>> {
  const unique = Array.from(new Set(ids)).filter((x) => typeof x === "string" && x.length < 100);
  if (!unique.length) return new Map();
  const items = await db.query.menuItems.findMany({
    where: inArray(schema.menuItems.id, unique),
    with: { optionGroups: { with: { choices: true } } },
  });
  return new Map(
    items.map((i) => [
      i.id,
      {
        id: i.id,
        name: i.name,
        priceCents: i.priceCents,
        isAvailable: i.isAvailable,
        isArchived: i.isArchived,
        maxPerOrder: i.maxPerOrder,
        gstTreatment: i.gstTreatment,
        prepLeadHours: i.prepLeadHours,
        dailyLimit: i.dailyLimit,
        availableDays: i.availableDays,
        optionGroups: [...i.optionGroups]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            choices: [...g.choices].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, name: c.name, priceDeltaCents: c.priceDeltaCents, isAvailable: c.isAvailable })),
          })),
      },
    ]),
  );
}
