import { ingestWebhook } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

/** Payment provider webhooks. The raw body is required for signature verification. */
export async function POST(req: Request, ctx: RouteContext<"/api/payments/webhook/[provider]">) {
  const { provider } = await ctx.params;
  if (provider !== "stripe" && provider !== "demo") return new Response("unknown provider", { status: 404 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return new Response("too large", { status: 413 });
  const r = await ingestWebhook(provider, raw, req.headers);
  return new Response(r.body, { status: r.status });
}
