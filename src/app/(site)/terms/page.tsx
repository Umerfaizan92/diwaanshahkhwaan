import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { DraftNotice, Prose } from "@/components/site/Prose";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "Terms for ordering from Diwaan Shah Khwaan.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const s = await getSettings();
  const who = s.legalName ?? s.businessName;
  return (
    <>
      <PageHeader title="Terms & conditions" />
      <Container className="py-12">
        <Prose>
          <DraftNotice updated="5 November 2026" />
          <p>
            These terms apply when you order from {who}
            {s.abn ? ` (ABN ${s.abn})` : ""} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) through this website. By placing an order you agree to them.
          </p>
          <h2>Orders</h2>
          <ul>
            <li>Orders are for pickup only from the {s.pickupArea} area. We don&apos;t deliver.</li>
            <li>An order is accepted and confirmed only when payment succeeds and we send your confirmation.</li>
            <li>Pickup times are subject to availability. Times shown at checkout are the ones we can fulfil.</li>
            <li>
              We may decline or cancel an order — for example if a dish becomes unavailable or there&apos;s a pricing error. If we
              do, we&apos;ll refund you in full.
            </li>
          </ul>
          <h2>Prices and payment</h2>
          <ul>
            <li>Prices are in Australian dollars and are the total price payable.</li>
            <li>
              {s.gstRegistered
                ? "Prices include GST where it applies. A tax invoice is issued for each order."
                : "We are not currently registered for GST, so no GST is charged."}
            </li>
            <li>Payment is taken online by our payment provider. We never receive or store your full card details.</li>
          </ul>
          <h2>Pickup</h2>
          <ul>
            <li>Please arrive within your pickup slot. The exact address is in your confirmation.</li>
            <li>For food safety, eat hot food promptly or refrigerate it within two hours.</li>
            <li>Food not collected within the pickup window can&apos;t be held.</li>
          </ul>
          <h2>Allergens</h2>
          <p>
            Tell us about allergies before ordering. We cook in a shared kitchen and can&apos;t guarantee any dish is free from
            allergens. See <Link href="/allergens">allergen information</Link>.
          </p>
          <h2>Cancellations and refunds</h2>
          <p>
            See our <Link href="/refunds">refund and cancellation policy</Link>. Nothing in these terms excludes your rights under
            the Australian Consumer Law.
          </p>
          <h2>Accounts</h2>
          <p>If you create an account, keep your password private. You&apos;re responsible for orders placed with your account.</p>
          <h2>Changes</h2>
          <p>We may update these terms. The version on this page when you order applies to that order.</p>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of Western Australia.</p>
        </Prose>
      </Container>
    </>
  );
}
