"use server";

import { staffAction } from "@/lib/server/action";
import * as svc from "@/lib/server/schedule-admin";

export async function saveRulesAction(input: unknown) {
  return staffAction("schedule:edit", (u) => svc.saveRules(u, input));
}
export async function saveHoursAction(input: unknown) {
  return staffAction("schedule:edit", (u) => svc.saveHours(u, input));
}
export async function addClosedDateAction(input: unknown) {
  return staffAction("schedule:edit", (u) => svc.addClosedDate(u, input));
}
export async function removeClosedDateAction(date: string) {
  return staffAction("schedule:edit", (u) => svc.removeClosedDate(u, date));
}
