import "server-only";
import { and, gte, isNotNull, lte, sql, eq } from "drizzle-orm";
import { getDb, schema, type DB } from "@/lib/db";

/** Sales between two local dates (inclusive), grouped by the local date the payment was made */
export async function salesReport(from: string, to: string, tz: string, db: DB = getDb()) {
  if (!/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(tz)) throw new Error("Invalid timezone");
  // Inlined (validated) so GROUP BY sees one identical expression
  const localPaid = sql`(${schema.orders.paidAt} at time zone ${sql.raw(`'${tz}'`)})::date`;
  const where = and(isNotNull(schema.orders.paidAt), gte(localPaid, sql`${from}::date`), lte(localPaid, sql`${to}::date`));
  const byDay = await db
    .select({
      day: sql<string>`to_char(${localPaid}, 'YYYY-MM-DD')`,
      orders: sql<number>`count(*)::int`,
      gross: sql<number>`sum(${schema.orders.totalCents})::int`,
      refunds: sql<number>`sum(${schema.orders.refundedCents})::int`,
      gst: sql<number>`sum(${schema.orders.gstCents})::int`,
    })
    .from(schema.orders)
    .where(where)
    .groupBy(localPaid)
    .orderBy(localPaid);
  const dishes = await db
    .select({ name: schema.orderItems.name, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, revenue: sql<number>`sum(${schema.orderItems.lineTotalCents})::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(where)
    .groupBy(schema.orderItems.name)
    .orderBy(sql`sum(${schema.orderItems.lineTotalCents}) desc`)
    .limit(50);
  const totals = byDay.reduce((t, d) => ({ orders: t.orders + d.orders, gross: t.gross + d.gross, refunds: t.refunds + d.refunds, gst: t.gst + d.gst }), { orders: 0, gross: 0, refunds: 0, gst: 0 });
  return { byDay, dishes, totals: { ...totals, net: totals.gross - totals.refunds, average: totals.orders ? Math.round(totals.gross / totals.orders) : 0 } };
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          let s = v === null ? "" : String(v);
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula injection guard
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}
