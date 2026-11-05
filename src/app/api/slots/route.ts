import { NextResponse } from "next/server";
import { z } from "zod";
import { cartLineSchema } from "@/lib/domain/cart-schema";
import { MAX_LINES } from "@/lib/domain/pricing";
import { availabilityForCart } from "@/lib/server/schedule";

export const dynamic = "force-dynamic";

const body = z.object({ lines: z.array(cartLineSchema.pick({ menuItemId: true, quantity: true })).max(MAX_LINES).default([]) });

/** Pickup calendar for the given cart (capacity, notice, cut-offs, holidays, dish limits) */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { days, ctx } = await availabilityForCart(parsed.data.lines);
  return NextResponse.json(
    { days, slotMinutes: ctx.rules.slotMinutes, timezone: ctx.rules.timezone, acceptingOrders: ctx.rules.acceptingOrders },
    { headers: { "Cache-Control": "no-store" } },
  );
}
