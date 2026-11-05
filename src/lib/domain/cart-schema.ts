import { z } from "zod";
import { MAX_LINES } from "./pricing";

export const cartLineSchema = z.object({
  menuItemId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(500),
  choiceIds: z.array(z.string().min(1).max(100)).max(30).default([]),
});
export const cartSchema = z.object({ lines: z.array(cartLineSchema).min(1, "Your cart is empty").max(MAX_LINES) });
