import { z } from "zod";
import { auPhone, email, personName } from "./validation";
import { cartLineSchema } from "./cart-schema";
import { MAX_LINES } from "./pricing";
import { isDateString, isTimeString } from "./time";

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(80).regex(/^[A-Za-z0-9_-]+$/),
  lines: z.array(cartLineSchema).min(1, "Your order is empty").max(MAX_LINES),
  name: personName,
  email,
  phone: auPhone,
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional().default(""),
  pickupDate: z.string().refine(isDateString, "Choose a pickup date"),
  pickupTime: z.string().refine(isTimeString, "Choose a pickup time"),
  smsOptIn: z.boolean().default(false),
  paymentMethod: z.enum(["CARD", "CASH"]).default("CARD"),
  acceptTerms: z.literal(true, { message: "Please accept the terms and refund policy" }),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
