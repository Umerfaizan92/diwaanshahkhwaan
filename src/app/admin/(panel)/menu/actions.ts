"use server";

import { staffAction } from "@/lib/server/action";
import * as svc from "@/lib/server/menu-admin";

const wrap = <T,>(r: svc.Result<T>) => (r.ok ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error, fieldErrors: r.fieldErrors });

export async function setAvailabilityAction(itemId: string, available: boolean) {
  return staffAction("menu:availability", async (u) => wrap(await svc.setItemAvailability(u, itemId, available)));
}
export async function quickUpdateAction(itemId: string, patch: { priceCents?: number; isFeatured?: boolean; isDailySpecial?: boolean }) {
  const clean: typeof patch = {};
  if (typeof patch.priceCents === "number") clean.priceCents = patch.priceCents;
  if (typeof patch.isFeatured === "boolean") clean.isFeatured = patch.isFeatured;
  if (typeof patch.isDailySpecial === "boolean") clean.isDailySpecial = patch.isDailySpecial;
  return staffAction("menu:edit", async (u) => wrap(await svc.quickUpdateItem(u, itemId, clean)));
}
export async function saveMenuItemAction(input: unknown) {
  return staffAction("menu:edit", async (u) => wrap(await svc.saveMenuItem(u, input)));
}
export async function archiveMenuItemAction(itemId: string, archived: boolean) {
  return staffAction("menu:edit", async (u) => wrap(await svc.archiveMenuItem(u, itemId, archived)));
}
export async function moveMenuItemAction(itemId: string, direction: -1 | 1) {
  return staffAction("menu:edit", async (u) => wrap(await svc.moveMenuItem(u, itemId, direction === -1 ? -1 : 1)));
}
export async function saveCategoryAction(input: unknown) {
  return staffAction("menu:edit", async (u) => wrap(await svc.saveCategory(u, input)));
}
export async function moveCategoryAction(id: string, direction: -1 | 1) {
  return staffAction("menu:edit", async (u) => wrap(await svc.moveCategory(u, id, direction === -1 ? -1 : 1)));
}
export async function deleteCategoryAction(id: string) {
  return staffAction("menu:edit", async (u) => wrap(await svc.deleteCategory(u, id)));
}
