"use server";

import { redirect } from "next/navigation";
import { loadOrderForViewer } from "@/lib/server/order-access";
import { cancelUnpaidOrder, reconcileOrder, startPayment } from "@/lib/server/payments";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export async function resumePayment(reference: string, token: string) {
  const order = await loadOrderForViewer(reference, token);
  if (!order) redirect("/");
  const r = await startPayment(order.id);
  if (r.ok) redirect(r.url);
  redirect(`/order/${reference}?t=${token}&error=${encodeURIComponent(r.error)}`);
}

export async function cancelCheckout(reference: string, token: string) {
  const order = await loadOrderForViewer(reference, token);
  if (!order) redirect("/");
  await cancelUnpaidOrder(order.id);
  redirect(`/order/${reference}?t=${token}`);
}

/** Server-to-server check with the payment provider; never trusts the redirect itself */
export async function checkPayment(reference: string, token: string) {
  const ip = await clientIp();
  if (!(await rateLimit(`reconcile:${ip}`, 30, 300))) return { changed: false };
  const order = await loadOrderForViewer(reference, token);
  if (!order || !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) return { changed: false };
  const r = await reconcileOrder(order.id);
  return { changed: r.changed };
}
