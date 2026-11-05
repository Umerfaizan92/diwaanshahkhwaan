import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { checkEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** Render health check: database reachable, migrations applied, configuration valid */
export async function GET() {
  const env = checkEnv();
  let db = "ok";
  let seeded = false;
  try {
    const r = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from business_settings`);
    seeded = Number(r.rows[0]?.n ?? 0) > 0;
  } catch {
    db = "unreachable";
  }
  const ok = db === "ok" && seeded && env.errors.length === 0;
  return Response.json(
    { status: ok ? "ok" : "error", db, seeded, configErrors: env.errors.length, mode: env.mode, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
