import "server-only";
import type { DbOrTx } from "@/lib/db";

export type OrderNotice = "order_confirmed" | "order_accepted" | "order_ready" | "order_cancelled" | "order_refunded" | "order_partially_refunded" | "pickup_reminder";

/**
 * Queues customer/owner notifications for an order event inside the caller's transaction.
 * Phase 6 implements the durable queue; until then this records nothing.
 */
export async function notifyOrder(db: DbOrTx, orderId: string, kind: OrderNotice, data: Record<string, unknown> = {}): Promise<void> {
  void db;
  void orderId;
  void kind;
  void data;
}
