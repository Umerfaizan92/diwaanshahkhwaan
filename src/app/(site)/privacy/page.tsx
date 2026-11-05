import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { DraftNotice, Prose } from "@/components/site/Prose";
import { getSettings } from "@/lib/server/settings";
import { toTelHref } from "@/lib/config/business";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Diwaan Shah Khwaan collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const s = await getSettings();
  const who = s.legalName ?? s.businessName;
  return (
    <>
      <PageHeader title="Privacy policy" />
      <Container className="py-12">
        <Prose>
          <DraftNotice updated="5 November 2026" />
          <p>
            {who} respects your privacy. This policy explains what personal information we collect, why, and how we handle it,
            following the Australian Privacy Principles as good practice.
          </p>
          <h2>What we collect</h2>
          <ul>
            <li>Your name, email address and phone number when you order, create an account or contact us.</li>
            <li>Your order details, pickup time and any notes you give us (including allergy information you choose to share).</li>
            <li>
              Payment confirmation details from our payment provider (such as the last four digits of your card). We never
              receive or store your full card number.
            </li>
            <li>Basic technical information needed to run the site securely, such as your IP address, in server logs.</li>
          </ul>
          <h2>How we use it</h2>
          <ul>
            <li>To prepare your order, contact you about it and send receipts and pickup updates.</li>
            <li>To answer your enquiries.</li>
            <li>To keep records we&apos;re required to keep, such as financial records.</li>
            <li>To protect the site from fraud and abuse.</li>
          </ul>
          <p>We don&apos;t sell your information, and we don&apos;t send marketing unless you&apos;ve asked us to.</p>
          <h2>Who we share it with</h2>
          <p>
            Only service providers that help us run the business: our payment provider (Stripe), our email and SMS providers,
            and our website hosting provider. Some of these providers may store data outside Australia. We share only what
            they need to provide their service.
          </p>
          <h2>Cookies</h2>
          <p>
            We use essential cookies only — to keep you signed in and to make checkout work. Your cart is kept in your
            browser&apos;s local storage. We don&apos;t use advertising cookies.
          </p>
          <h2>Security and retention</h2>
          <p>
            Information is stored with access controls and encryption in transit. We keep order records for as long as needed
            for tax and legal purposes, then delete or de-identify them.
          </p>
          <h2>Access, correction and complaints</h2>
          <p>
            You can ask to see or correct the information we hold about you, or raise a privacy concern, by contacting us. If
            you&apos;re not satisfied with our response, you can contact the Office of the Australian Information Commissioner
            (oaic.gov.au).
          </p>
          <ul>
            {s.contacts.map((c) => (
              <li key={c.phone}>
                <a href={toTelHref(c.phone)}>{c.phone}</a>
                {c.name ? ` — ${c.name}` : ""}
              </li>
            ))}
            {s.email ? (
              <li>
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </li>
            ) : null}
          </ul>
        </Prose>
      </Container>
    </>
  );
}
