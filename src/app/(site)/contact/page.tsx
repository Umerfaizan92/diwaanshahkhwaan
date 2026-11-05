import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/site/PageHeader";
import { PickupContact } from "@/components/site/PickupContact";
import { getOpeningHours, getSettings } from "@/lib/server/settings";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, text or message Diwaan Shah Khwaan about orders, bulk BBQ orders and allergies. Pickup in Langford WA 6147.",
  alternates: { canonical: "/contact" },
};

const TOPICS = ["general", "bulk", "order", "allergy"];

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const topic = typeof sp.topic === "string" && TOPICS.includes(sp.topic) ? sp.topic : "general";
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  return (
    <>
      <PageHeader title="Contact" intro="The quickest way to reach us is a call or text. For anything else, send a message below." />
      <Container className="space-y-14 py-12">
        <PickupContact settings={settings} hours={hours} headingLevel={2} />
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Send us a message</h2>
            <p className="mt-3 max-w-md text-muted">
              Planning a gathering? Tell us the date, number of guests and what you&apos;d like, and we&apos;ll come back with a quote.
            </p>
          </div>
          <ContactForm topic={topic} />
        </div>
      </Container>
    </>
  );
}
