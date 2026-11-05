import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
/** A db handle or a transaction handle */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;

const globalForDb = globalThis as unknown as { __dskPool?: Pool; __dskDb?: DB };

function createPool(url: string) {
  const needsSsl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === "true";
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export function getDb(): DB {
  if (!globalForDb.__dskDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__dskPool = createPool(url);
    globalForDb.__dskDb = drizzle(globalForDb.__dskPool, { schema });
  }
  return globalForDb.__dskDb;
}

/** Test helper: point the shared client at another database */
export function setDbForTests(url: string): DB {
  globalForDb.__dskPool = createPool(url);
  globalForDb.__dskDb = drizzle(globalForDb.__dskPool, { schema });
  return globalForDb.__dskDb;
}

export async function closeDb() {
  await globalForDb.__dskPool?.end();
  globalForDb.__dskPool = undefined;
  globalForDb.__dskDb = undefined;
}

export { schema };
