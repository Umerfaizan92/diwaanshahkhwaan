import "server-only";
import { getDb, schema, type DbOrTx } from "@/lib/db";

export async function audit(
  actor: { id: string; email: string } | null,
  action: string,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>,
  db: DbOrTx = getDb(),
) {
  await db.insert(schema.auditLogs).values({ actorId: actor?.id ?? null, actorEmail: actor?.email ?? "system", action, entity, entityId, details: details ?? null });
}
