import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { BusinessSettingsForm } from "@/components/admin/SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaffPage("settings:edit");
  const s = await getSettings();
  return (
    <>
      <AdminHeader title="Business settings" intro="Your details as they appear on the website, receipts and emails." />
      <Panel>
        <BusinessSettingsForm
          initial={{
            businessName: s.businessName,
            legalName: s.legalName,
            tagline: s.tagline,
            abn: s.abn,
            email: s.email,
            contacts: s.contacts,
            pickupArea: s.pickupArea,
            pickupAddress: s.pickupAddress,
            pickupInstructions: s.pickupInstructions,
            announcement: s.announcement,
            gstRegistered: s.gstRegistered,
            gstMode: s.gstMode,
            acceptCash: s.acceptCash,
            acceptCard: s.acceptCard,
            halalCertified: s.halalCertified,
            halalCertifier: s.halalCertifier ?? "",
            halalCertNumber: s.halalCertNumber ?? "",
          }}
        />
      </Panel>
    </>
  );
}
