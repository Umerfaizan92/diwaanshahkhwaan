"use server";

import { createReservation } from "@/lib/server/orders";
import { getCustomer } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import type { CheckoutInput } from "@/lib/domain/checkout-schema";
import { startPayment } from "@/lib/server/payments";

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; lineErrors?: { key: string; message: string }[]; refreshSlots?: boolean };

/**
 * Holds the pickup slot (transactionally) and creates a hosted payment session.
 * The order is NOT confirmed here — only a verified payment confirmation does that.
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`checkout:${ip}`, 15, 600))) return { ok: false, error: "Too many checkout attempts. Please wait a few minutes and try again." };

  const customer = await getCustomer();
  const res = await createReservation(input, { customerId: customer?.id ?? null });
  if (!res.ok) {
    return { ok: false, error: res.error, fieldErrors: res.fieldErrors, lineErrors: res.lineErrors, refreshSlots: res.code === "SLOT" };
  }
  const pay = await startPayment(res.order.id);
  if (!pay.ok) return { ok: false, error: pay.error };
  return { ok: true, redirectUrl: pay.url };
}
