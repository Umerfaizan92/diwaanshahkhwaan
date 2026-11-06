ALTER TABLE "business_settings" ADD COLUMN "halal_certified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "halal_certifier" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "halal_cert_number" text;--> statement-breakpoint
-- Owner confirmed the kitchen is halal certified (6 Nov 2026); certifier and number to be added in Settings
UPDATE "business_settings" SET "halal_certified" = true;
