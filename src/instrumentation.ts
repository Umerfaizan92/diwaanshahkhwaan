/**
 * Starts the in-process background worker (hold expiry, payment reconciliation, notifications)
 * when the server boots. Set IN_PROCESS_WORKER=false to rely only on /api/cron/sweep.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/server/env");
  const report = checkEnv();
  for (const w of report.warnings) console.warn(`[config] ${w}`);
  for (const e of report.errors) console.error(`[config] ${e}`);
  if (report.errors.length && process.env.NODE_ENV === "production") {
    throw new Error(`Refusing to start: ${report.errors.join("; ")}`);
  }
  if (process.env.IN_PROCESS_WORKER === "false" || process.env.NODE_ENV === "test") return;
  const { runBackgroundTick } = await import("./lib/server/worker");
  const g = globalThis as unknown as { __dskWorker?: NodeJS.Timeout };
  if (g.__dskWorker) return;
  const tick = () => runBackgroundTick().catch((e) => console.error("[worker]", e));
  g.__dskWorker = setInterval(tick, 30_000);
  g.__dskWorker.unref?.();
  setTimeout(tick, 5_000).unref?.();
}
