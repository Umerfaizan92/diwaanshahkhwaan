import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { loadOrderForViewer } from "@/lib/server/order-access";
import { cancelCheckout, resumePayment } from "../../order/[ref]/actions";

export const metadata: Metadata = { title: "Payment not completed", robots: { index: false } };

export default async function CheckoutCancelledPage({ searchParams }: PageProps<"/checkout/cancelled">) {
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  const order = await loadOrderForViewer(ref, t);
  if (!order) notFound();
  const holdValid = !!order.holdExpiresAt && order.holdExpiresAt > new Date() && ["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status);
  return (
    <Container className="max-w-xl pb-10 pt-28 text-center lg:pt-36">
      <h1 className="font-display text-3xl">{sp.declined ? "Your payment was declined" : "Payment not completed"}</h1>
      <p className="mt-3 text-muted">No money has been taken for order {order.reference}.</p>
      {holdValid ? (
        <>
          <p className="mt-2 text-muted">We&apos;re still holding your pickup time for a few more minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <form action={resumePayment.bind(null, order.reference, order.trackingToken)}>
              <button className={buttonClass("gold", "lg")}>Try payment again</button>
            </form>
            <form action={cancelCheckout.bind(null, order.reference, order.trackingToken)}>
              <button className={buttonClass("outline", "lg")}>Cancel order</button>
            </form>
          </div>
        </>
      ) : (
        <a href="/cart" className={buttonClass("gold", "lg", "mt-8")}>
          Back to your order
        </a>
      )}
    </Container>
  );
}
