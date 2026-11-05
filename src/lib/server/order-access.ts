import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getCustomer, getStaff } from "./auth";
import { getOrderByReference } from "./orders";

function safeEqual(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Loads an order only for someone entitled to see it: the tracking-link holder, the account owner, or staff */
export async function loadOrderForViewer(reference: string, token: string | undefined) {
  if (!/^DSK-[A-Z2-9]{6}$/.test(reference)) return null;
  const order = await getOrderByReference(reference);
  if (!order) return null;
  if (token && safeEqual(token, order.trackingToken)) return order;
  const customer = await getCustomer();
  if (customer && order.customerId === customer.id) return order;
  if (await getStaff()) return order;
  return null;
}
