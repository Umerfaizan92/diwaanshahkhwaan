import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/server/cron";
import { runBackgroundTick } from "@/lib/server/worker";

export const dynamic = "force-dynamic";

/** For an external scheduler (e.g. a Render cron job). Authorization: Bearer <CRON_SECRET> */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runBackgroundTick());
}
