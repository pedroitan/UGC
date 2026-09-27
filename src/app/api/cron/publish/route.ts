import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron a cada minuto: publica posts com publish_at vencido.
 * F0: retorna 200 sem fazer nada. Em F3: claim_due_schedules() +
 * content_publishing_limit + container/publish na Meta.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  if (!isCronAuthorized(request, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, published: 0 });
}
