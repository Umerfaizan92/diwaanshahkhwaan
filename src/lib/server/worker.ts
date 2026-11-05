import "server-only";
import { sweepPayments } from "./payments";

let running = false;

/** One pass of background work. Safe to call concurrently from several instances. */
export async function runBackgroundTick(now = new Date()) {
  if (running) return { skipped: true };
  running = true;
  try {
    const payments = await sweepPayments(now);
    return { skipped: false, payments };
  } finally {
    running = false;
  }
}
