"use server";

import { randomUUID } from "node:crypto";
import { staffAction } from "@/lib/server/action";
import * as orders from "@/lib/server/admin-orders";
import * as misc from "@/lib/server/admin-misc";
import { reconcileOrder, refundOrder } from "@/lib/server/payments";
import { audit } from "@/lib/server/audit";
import type { OrderStatus } from "@/lib/db/schema";
import { parseDollarsToCents } from "@/lib/domain/money";

export async function transitionAction(orderId: string, to: OrderStatus, note: string | null) {
  // orders:view is the floor; staffTransition checks the specific permission for the move
  return staffAction("orders:view", (u) => orders.staffTransition(u, orderId, to, note));
}
export async function clearAttentionAction(orderId: string) {
  return staffAction("orders:update", (u) => orders.clearAttention(u, orderId));
}
export async function reconcileAction(orderId: string) {
  return staffAction("payments:reconcile", async (u) => {
    const r = await reconcileOrder(orderId);
    await audit(u, "payment.reconcile", "order", orderId, { results: r.results });
    return { ok: true, message: r.results.length ? `Checked with the provider: ${r.results.join("; ")}` : "No open payments to check" };
  });
}
export async function refundAction(input: { orderId: string; amount: string; reason: string; cancelOrder: boolean; key: string }) {
  return staffAction("orders:refund", async (u) => {
    const cents = parseDollarsToCents(input.amount);
    if (cents === null) return { ok: false, error: "Enter an amount like 12.50" };
    const r = await refundOrder(u, { orderId: input.orderId, amountCents: cents, reason: input.reason.slice(0, 300), idempotencyKey: input.key || randomUUID().replace(/-/g, ""), cancelOrder: input.cancelOrder });
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
  });
}
export async function saveSettingsAction(input: unknown) {
  return staffAction("settings:edit", (u) => misc.saveSettings(u, input));
}
export async function saveNotificationSettingsAction(input: unknown) {
  return staffAction("notifications:manage", (u) => misc.saveNotificationSettings(u, input));
}
export async function createStaffAction(input: unknown) {
  return staffAction("staff:manage", (u) => misc.createStaff(u, input));
}
export async function updateStaffAction(id: string, patch: { role?: string; active?: boolean; password?: string }) {
  return staffAction("staff:manage", (u) => misc.updateStaff(u, id, patch));
}
export async function saveCustomerNoteAction(email: string, notes: string) {
  return staffAction("customers:edit", (u) => misc.saveCustomerNote(u, email, notes));
}
export async function setMessageHandledAction(id: string, handled: boolean) {
  return staffAction("messages:view", (u) => misc.setMessageHandled(u, id, handled));
}
export async function uploadMediaAction(form: FormData) {
  return staffAction("menu:edit", (u) => misc.uploadMedia(u, form.get("file") as File, String(form.get("alt") ?? "")));
}
export async function deleteMediaAction(id: string) {
  return staffAction("menu:edit", (u) => misc.deleteMedia(u, id));
}
