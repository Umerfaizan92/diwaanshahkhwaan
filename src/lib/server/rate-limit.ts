import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { headers } from "next/headers";

/**
 * Fixed-window rate limiter stored in Postgres (works across instances).
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = getDb();
  const res = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`);
  return Number(res.rows[0]?.count ?? 0) <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}
