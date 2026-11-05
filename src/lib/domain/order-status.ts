import type { OrderStatus } from "@/lib/db/schema";

/** Statuses that hold kitchen capacity (besides unexpired PENDING_PAYMENT holds) */
export const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "COLLECTED"];

/** The kitchen workflow and allowed manual transitions. Payment-driven ones are handled by the payment service. */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["NEW", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"],
  PAYMENT_FAILED: ["NEW", "EXPIRED", "CANCELLED"],
  EXPIRED: ["NEW"], // late payment for an expired hold — needs owner review
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  EXPIRED: "Expired (unpaid)",
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready for pickup",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** What the customer sees on their tracking page */
export const CUSTOMER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "NEW", label: "Order received" },
  { status: "CONFIRMED", label: "Confirmed by the kitchen" },
  { status: "PREPARING", label: "Being prepared" },
  { status: "READY", label: "Ready for pickup" },
  { status: "COLLECTED", label: "Collected" },
];
