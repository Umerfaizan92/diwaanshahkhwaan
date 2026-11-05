import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { formatCents } from "@/lib/domain/money";
import { demoOutcome } from "./actions";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DemoPayPage({ params }: PageProps<"/pay/demo/[id]">) {
  if (process.env.PAYMENT_PROVIDER !== "demo") notFound();
  const { id } = await params;
  const [s] = await getDb().select().from(schema.demoPaymentSessions).where(eq(schema.demoPaymentSessions.id, id));
  if (!s) notFound();
  const expired = s.status === "open" && s.expiresAt < new Date();

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-[#f4f5f7] px-4 py-10 text-[#1f2430]" style={{ colorScheme: "light" }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="bg-[#fff4cc] px-6 py-3 text-sm font-semibold text-[#6b4e00]">TEST MODE — this is a simulated payment page. No card is charged.</div>
        <div className="p-6">
          <p className="text-sm text-[#5b6170]">Diwaan Shah Khwaan</p>
          <h1 className="mt-1 text-3xl font-bold">{formatCents(s.amountCents)}</h1>
          <p className="text-sm text-[#5b6170]">Order {s.orderReference}</p>
          {s.status !== "open" || expired ? (
            <p className="mt-6 rounded-lg bg-[#f4f5f7] p-4">This payment session is {expired ? "expired" : s.status}.</p>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-[#d9dce3] p-3 text-sm text-[#5b6170]">Card 4242 4242 4242 4242 · 12/34 · 123 (test card)</div>
              <form action={demoOutcome.bind(null, id, "pay")}>
                <button className="h-12 w-full rounded-lg bg-[#1f2430] font-semibold text-white hover:bg-black">Pay {formatCents(s.amountCents)}</button>
              </form>
              <form action={demoOutcome.bind(null, id, "decline")}>
                <button className="h-11 w-full rounded-lg border border-[#d9dce3] font-semibold text-[#b3261e] hover:bg-[#fff5f5]">Simulate a declined card</button>
              </form>
              <form action={demoOutcome.bind(null, id, "cancel")}>
                <button className="h-11 w-full rounded-lg font-semibold text-[#5b6170] hover:bg-[#f4f5f7]">Cancel and go back</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
