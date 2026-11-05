import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadOrderForViewer } from "@/lib/server/order-access";
import { getSettings } from "@/lib/server/settings";
import { formatCents } from "@/lib/domain/money";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";
import { PrintButton } from "@/components/shop/PrintButton";
import { OrderTotals } from "@/components/shop/OrderTotals";

export const metadata: Metadata = { title: "Receipt", robots: { index: false, follow: false } };

export default async function ReceiptPage({ params, searchParams }: PageProps<"/order/[ref]/receipt">) {
  const { ref } = await params;
  const sp = await searchParams;
  const [order, s] = await Promise.all([loadOrderForViewer(ref, typeof sp.t === "string" ? sp.t : undefined), getSettings()]);
  const cash = order?.paymentMethod === "CASH";
  const cashOpen = !!order && cash && !["CANCELLED", "REFUNDED", "EXPIRED"].includes(order.status);
  if (!order || (!order.paidAt && !cashOpen)) notFound();
  // A tax invoice requires GST registration at the time of sale and an ABN
  const taxInvoice = order.gstRegisteredAtOrder && !!s.abn;
  const issued = new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeStyle: "short", timeZone: s.timezone }).format(order.paidAt ?? order.createdAt);
  const taxable = order.items.filter((i) => i.gstTreatment === "TAXABLE");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 lg:pt-32">
      <div className="rounded-2xl border border-line bg-raised p-6 sm:p-10 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">{taxInvoice ? "Tax invoice" : "Receipt"}</h1>
            <p className="text-sm text-muted">
              {order.reference} · {issued}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{s.legalName ?? s.businessName}</p>
            {s.abn ? <p>ABN {s.abn}</p> : null}
            <p>{s.pickupAddress ?? s.pickupArea}</p>
            {s.contacts[0] ? <p>{s.contacts[0].phone}</p> : null}
            {s.email ? <p>{s.email}</p> : null}
          </div>
        </div>
        <p className="mt-6 text-sm">
          Billed to: {order.customerName} · {order.customerEmail}
        </p>
        <p className="text-sm">
          Pickup: {formatDateLong(order.pickupDate)}, {formatTime12(order.pickupTime)}
        </p>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 font-semibold">Item</th>
              <th scope="col" className="py-2 text-right font-semibold">Qty</th>
              <th scope="col" className="py-2 text-right font-semibold">Unit</th>
              <th scope="col" className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2">
                  {i.name}
                  {taxInvoice && i.gstTreatment === "TAXABLE" ? " *" : ""}
                  {i.options.length ? <span className="block text-xs text-muted">{i.options.map((o) => o.choice).join(", ")}</span> : null}
                </td>
                <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatCents(i.unitPriceCents)}</td>
                <td className="py-2 text-right tabular-nums">{formatCents(i.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <OrderTotals
          className="mt-4 border-t border-line pt-3 text-sm"
          size="md"
          subtotalCents={order.subtotalCents}
          gstCents={order.gstCents}
          totalCents={order.totalCents}
          totalLabel={cash ? (order.paidAt ? "Total paid in cash (AUD)" : "Total due in cash at pickup (AUD)") : "Total paid (AUD)"}
        />
        <dl className="mt-1 space-y-1 text-sm">
          {order.refundedCents ? (
            <div className="flex justify-between text-danger">
              <dt>Refunded</dt>
              <dd className="tabular-nums">−{formatCents(order.refundedCents)}</dd>
            </div>
          ) : null}
        </dl>
        {taxInvoice && taxable.length !== order.items.length ? <p className="mt-3 text-xs text-muted">* Taxable supply. Other items are GST-free.</p> : null}
        {!taxInvoice ? <p className="mt-6 text-xs text-muted">{s.gstRegistered ? "" : "No GST has been charged."} This is a receipt, not a tax invoice.</p> : null}
        <p className="mt-2 text-xs text-muted">{cash ? (order.paidAt ? "Paid in cash at pickup." : "Payment: cash at pickup.") : "Paid by card through Stripe secure checkout."}</p>
      </div>
      <div className="no-print mt-6 flex justify-center">
        <PrintButton />
      </div>
    </div>
  );
}
