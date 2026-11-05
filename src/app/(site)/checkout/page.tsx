import type { Metadata } from "next";
import { Container } from "@/components/site/PageHeader";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { getCustomer } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [customer, settings] = await Promise.all([getCustomer(), getSettings()]);
  const smsAvailable = settings.notifySmsEnabled && (process.env.SMS_PROVIDER ?? "none") !== "none";
  return (
    <Container className="pb-10 pt-24 lg:pt-32">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">Checkout</h1>
      {settings.acceptingOrders ? (
        <CheckoutForm prefill={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null} signedIn={!!customer} smsAvailable={smsAvailable} acceptCash={settings.acceptCash} acceptCard={settings.acceptCard} />
      ) : (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-4">We&apos;re not taking online orders right now. Please call us to order.</p>
      )}
    </Container>
  );
}
