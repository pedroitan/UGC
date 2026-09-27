import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook dos provedores de mídia (kie.ai/Higgsfield). F1: stub que valida o
 * segredo e responde 200. Em F2/F4: parseWebhook → copia mídia para o Storage
 * → avança o PipelineRun.
 */
export async function POST(request: Request) {
  const env = serverEnv();
  if (!isCronAuthorized(request, env.MEDIA_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
