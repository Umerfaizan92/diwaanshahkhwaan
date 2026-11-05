import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { DraftNotice, Prose } from "@/components/site/Prose";
import { getSettings } from "@/lib/server/settings";
import { toTelHref } from "@/lib/config/business";

export const metadata: Metadata = {
  title: "Refunds & cancellations",
  description: "How cancellations, changes and refunds work for Diwaan Shah Khwaan pickup orders.",
  alternates: { canonical: "/refunds" },
};

export default async function RefundsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Refunds & cancellations" />
      <Container className="py-12">
        <Prose>
          <DraftNotice updated="5 November 2026" />
          <h2>Your rights</h2>
          <p>
            Our food comes with guarantees that cannot be excluded under the Australian Consumer Law. If something is
            wrong with your order — for example it&apos;s incorrect, incomplete or not of acceptable quality — you&apos;re entitled to
            a remedy. Nothing in this policy limits those rights.
          </p>
          <h2>Cancelling or changing an order</h2>
          <ul>
            <li>
              <strong>{s.cancelDeadlineHours}+ hours before pickup:</strong> contact us and we&apos;ll cancel with a full refund, or change
              your order or pickup time if there&apos;s capacity.
            </li>
            <li>
              <strong>Less than {s.cancelDeadlineHours} hours before pickup:</strong> we&apos;ve usually bought ingredients and started
              cooking, so we may not be able to refund. Contact us anyway — we&apos;ll do what we reasonably can.
            </li>
            <li>
              <strong>Orders not collected:</strong> food that isn&apos;t picked up within the pickup window can&apos;t be held for food
              safety reasons, and isn&apos;t refundable unless we were at fault.
            </li>
          </ul>
          <h2>If we have to cancel</h2>
          <p>
            Occasionally we may need to cancel (for example illness or an emergency). If we do, we&apos;ll contact you as soon as
            possible and refund you in full.
          </p>
          <h2>Problems with your order</h2>
          <p>
            Please tell us as soon as possible, ideally at pickup or the same day, so we can put it right. A photo helps. We&apos;ll
            offer a replacement, a partial refund or a full refund depending on the problem.
          </p>
          <h2>How refunds are paid</h2>
          <p>
            Refunds go back to the card you paid with. They&apos;re processed straight away on our side; banks usually take 5–10
            business days to show them.
          </p>
          <h2>Contact</h2>
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
