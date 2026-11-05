import { z } from "zod";
import { ALLERGEN_OPTIONS } from "./allergens";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Add a web address name (2+ characters)")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const cents = z.number().int().min(-100_000).max(1_000_000);

export const choiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name each choice").max(60),
  priceDeltaCents: cents,
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

export const groupSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Name each option group").max(60),
    kind: z.enum(["PORTION", "MODIFIER"]),
    required: z.boolean(),
    minSelect: z.number().int().min(0).max(20),
    maxSelect: z.number().int().min(1).max(20),
    choices: z.array(choiceSchema).min(1, "Each option group needs at least one choice").max(20),
  })
  .superRefine((g, ctx) => {
    if (g.kind === "PORTION" && g.maxSelect !== 1) ctx.addIssue({ code: "custom", message: `${g.name}: portion groups allow exactly one choice`, path: ["maxSelect"] });
    if (g.minSelect > g.maxSelect) ctx.addIssue({ code: "custom", message: `${g.name}: minimum can't exceed maximum`, path: ["minSelect"] });
    if (g.maxSelect > g.choices.length) ctx.addIssue({ code: "custom", message: `${g.name}: maximum is more than the number of choices`, path: ["maxSelect"] });
    if (g.choices.filter((c) => c.isDefault).length > g.maxSelect) ctx.addIssue({ code: "custom", message: `${g.name}: too many default choices`, path: ["choices"] });
  });

export const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Add the dish name").max(100),
  slug,
  categoryId: z.string().min(1, "Choose a category"),
  shortDescription: z.string().trim().max(140, "Keep the short description under 140 characters"),
  description: z.string().trim().max(2000),
  portion: z.string().trim().max(40).nullable(),
  priceCents: z.number().int().min(0, "Price can't be negative").max(1_000_000, "Price looks too high"),
  imagePath: z.string().max(300).nullable(),
  imageAlt: z.string().trim().max(200).nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  isDailySpecial: z.boolean(),
  isVegetarian: z.boolean(),
  spiceLevel: z.number().int().min(0).max(3),
  ingredients: z.string().trim().max(1000).nullable(),
  allergens: z.array(z.enum(ALLERGEN_OPTIONS)).max(20),
  mayContain: z.array(z.enum(ALLERGEN_OPTIONS)).max(20),
  allergensConfirmed: z.boolean(),
  gstTreatment: z.enum(["TAXABLE", "GST_FREE"]),
  dailyLimit: z.number().int().min(1).max(10_000).nullable(),
  maxPerOrder: z.number().int().min(1).max(500),
  prepLeadHours: z.number().int().min(0).max(24 * 30),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7),
  optionGroups: z.array(groupSchema).max(10),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Add a category name").max(80),
  slug,
  description: z.string().trim().max(300).nullable(),
  isVisible: z.boolean(),
});
export type CategoryInput = z.infer<typeof categorySchema>;
