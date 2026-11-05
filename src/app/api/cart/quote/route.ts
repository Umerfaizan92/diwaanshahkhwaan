import { NextResponse } from "next/server";
import { cartSchema } from "@/lib/domain/cart-schema";
import { quoteCart } from "@/lib/server/cart";

export const dynamic = "force-dynamic";

/** Re-prices a cart from the database. The client sends ids and quantities only. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid cart" }, { status: 400 });
  const quote = await quoteCart(parsed.data.lines);
  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
