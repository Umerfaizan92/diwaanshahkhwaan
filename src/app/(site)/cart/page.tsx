import type { Metadata } from "next";
import { Container } from "@/components/site/PageHeader";
import { CartView } from "@/components/shop/CartView";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <Container className="pb-10 pt-24 lg:pt-32">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">Your order</h1>
      <CartView acceptingOrders={settings.acceptingOrders} />
    </Container>
  );
}
