import { and, asc, gte, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { AuthError, requireStaff } from "@/lib/server/auth";
import { toCsv } from "@/lib/server/reports";
import { getSettings } from "@/lib/server/settings";
import { isDateString } from "@/lib/domain/time";
import { audit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** CSV of paid orders for the accountant (owner/manager only) */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireStaff("reports:view");
  } catch (e) {
    return new Response(e instanceof AuthError ? e.message : "Error", { status: e instanceof AuthError ? e.status : 500 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isDateString(from) || !isDateString(to)) return new Response("Invalid dates", { status: 400 });
  const s = await getSettings();
  const local = sql`(${schema.orders.paidAt} at time zone ${s.timezone})::date`;
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(and(isNotNull(schema.orders.paidAt), gte(local, sql`${from}::date`), lte(local, sql`${to}::date`)))
    .orderBy(asc(schema.orders.paidAt));
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "short", timeStyle: "short", timeZone: s.timezone }).format(d);
  const csv = toCsv([
    ["Reference", "Paid at (Perth)", "Pickup date", "Pickup time", "Status", "Customer", "Email", "Phone", "Total AUD", "GST AUD", "Refunded AUD"],
    ...rows.map((o) => [o.reference, fmt(o.paidAt!), o.pickupDate, o.pickupTime, o.status, o.customerName, o.customerEmail, o.customerPhone, (o.totalCents / 100).toFixed(2), (o.gstCents / 100).toFixed(2), (o.refundedCents / 100).toFixed(2)]),
  ]);
  await audit(user, "report.export", "orders", null, { from, to, rows: rows.length });
  return new Response("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dsk-orders-${from}-to-${to}.csv"`, "Cache-Control": "no-store" } });
}
