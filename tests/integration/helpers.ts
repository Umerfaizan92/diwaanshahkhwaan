import { sql } from "drizzle-orm";
import { setDbForTests, closeDb, getDb } from "@/lib/db";
import { seed } from "../../scripts/seed";
import type { StaffUser } from "@/lib/server/auth";

export const TEST_URL = process.env.TEST_DATABASE_URL!;

export async function resetDb() {
  if (!TEST_URL || !/test/i.test(TEST_URL)) throw new Error("Refusing to run integration tests: TEST_DATABASE_URL must point at a database with 'test' in its name");
  process.env.DATABASE_URL = TEST_URL;
  const db = setDbForTests(TEST_URL);
  const tables = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = tables.rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
  const owner = process.env.SEED_OWNER_EMAIL;
  delete process.env.SEED_OWNER_EMAIL;
  await seed(TEST_URL, { quiet: true });
  if (owner) process.env.SEED_OWNER_EMAIL = owner;
  return getDb();
}

export const owner: StaffUser = { id: "00000000-0000-0000-0000-000000000001", email: "owner@test", name: "Owner", role: "OWNER" };

export { closeDb };
