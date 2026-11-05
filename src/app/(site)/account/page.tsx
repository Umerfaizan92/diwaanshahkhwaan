import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { getCustomer } from "@/lib/server/auth";
import { getDb, schema } from "@/lib/db";
import { formatCents } from "@/lib/domain/money";
import { formatDateShort } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { AuthForms, DetailsForm } from "./AccountForms";
import { logoutCustomer } from "./actions";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  const me = await getCustomer();
  if (!me) {
    return (
      <>
        <PageHeader title="My account" intro="Sign in to see your order history and receipts. You can always check out as a guest." />
        <Container className="py-12">
          <AuthForms next={next} />
        </Container>
      </>
    );
  }
  const orders = await getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.customerId, me.id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);
  const visible = orders.filter((o) => o.paidAt || o.status === "PENDING_PAYMENT" || o.status === "PAYMENT_FAILED");
  return (
    <>
      <PageHeader title={`Hello, ${me.name.split(" ")[0]}`} intro="Your orders and receipts." />
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="hist">
          <h2 id="hist" className="font-display text-2xl">
            Order history
          </h2>
          {visible.length ? (
            <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
              {visible.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.reference}?t=${o.trackingToken}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-gold">
                    <span>
                      <span className="font-semibold">{o.reference}</span>
                      <span className="block text-sm text-muted">
                        Pickup {formatDateShort(o.pickupDate)} at {formatTime12(o.pickupTime)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block tabular-nums">{formatCents(o.totalCents)}</span>
                      <span className="text-sm text-muted">{STATUS_LABEL[o.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">
              No orders yet. Orders you place while signed in appear here. <Link href="/menu" className="text-gold underline">Browse the menu</Link>
            </p>
          )}
        </section>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-raised p-5">
            <h2 className="mb-4 font-semibold">Your details</h2>
            <p className="mb-3 text-sm text-muted">{me.email}</p>
            <DetailsForm name={me.name} phone={me.phone} />
          </div>
          <form action={logoutCustomer}>
            <button className="text-sm text-muted underline hover:text-danger">Sign out</button>
          </form>
        </aside>
      </Container>
    </>
  );
}
