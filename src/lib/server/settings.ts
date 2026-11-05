import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { BUSINESS_DEFAULTS } from "@/lib/config/business";
import type { BusinessSettings, OpeningHours } from "@/lib/db/schema";

export const getSettings = cache(async (): Promise<BusinessSettings> => {
  const db = getDb();
  const [row] = await db.select().from(schema.businessSettings).limit(1);
  if (row) return row;
  // Fallback before seeding: never crash the public site
  return {
    id: 1,
    businessName: BUSINESS_DEFAULTS.businessName,
    tagline: BUSINESS_DEFAULTS.tagline,
    contacts: BUSINESS_DEFAULTS.contacts,
    email: null,
    abn: null,
    legalName: null,
    pickupArea: BUSINESS_DEFAULTS.pickupArea,
    pickupAddress: null,
    pickupInstructions: BUSINESS_DEFAULTS.pickupInstructions,
    gstRegistered: false,
    timezone: BUSINESS_DEFAULTS.timezone,
    minNoticeHours: 24,
    maxAdvanceDays: 14,
    dailyOrderLimit: 30,
    slotMinutes: 30,
    slotCapacity: 4,
    orderCutoffTime: "20:00",
    cancelDeadlineHours: 24,
    paymentHoldMinutes: 20,
    acceptingOrders: false,
    announcement: null,
    notifyEmailEnabled: true,
    notifySmsEnabled: false,
    notifyOwnerNewOrder: true,
    ownerNotifyEmail: null,
    reminderHoursBefore: 3,
    updatedAt: new Date(),
  };
});

export const getOpeningHours = cache(async (): Promise<OpeningHours[]> => {
  const db = getDb();
  return db.select().from(schema.openingHours).orderBy(asc(schema.openingHours.dayOfWeek));
});
