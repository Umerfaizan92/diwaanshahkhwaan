ALTER TABLE "business_settings" ADD COLUMN "gst_mode" text DEFAULT 'INCLUSIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "accept_cash" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "accept_card" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "owner_notify_phone" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "notify_owner_sms" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" text DEFAULT 'CARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cash_collected_at" timestamp with time zone;