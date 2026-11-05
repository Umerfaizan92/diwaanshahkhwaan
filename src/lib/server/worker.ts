import "server-only";
import { sweepPayments } from "./payments";
import { processNotificationJobs } from "./notifications";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

let running = false;

/** One pass of background work. Safe to call concurrently from several instances. */
export async function runBackgroundTick(now = new Date()) {
  if (running) return { skipped: true };
  running = true;
  try {
    const payments = await sweepPayments(now);
    const notifications = await processNotificationJobs({ now });
    // Housekeeping: expired sessions and old rate-limit windows
    if (now.getMinutes() % 10 === 0) {
      const db = getDb();
      await db.execute(sql`delete from sessions where expires_at < now()`);
      await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
    }
    return { skipped: false, payments, notifications };
  } finally {
    running = false;
  }
}

/** Sends queued notifications soon after a request, without making the request wait */
export function kickNotifications() {
  setTimeout(() => {
    processNotificationJobs().catch((e) => console.error("[notifications]", e));
  }, 250).unref?.();
}
