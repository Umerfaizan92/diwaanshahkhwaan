CREATE TABLE "demo_payment_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"order_reference" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'aud' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payment_id" text,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
