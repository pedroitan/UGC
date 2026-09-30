import { NextResponse } from "next/server";
import { findPipelineRunByExternalTaskId } from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";
import { serverEnv } from "@/lib/env";
import { processMediaRunResult } from "@/lib/pipeline/media";
import { getMediaProvider } from "@/lib/providers";
import type { KieMediaProvider, KieWebhookParsed } from "@/lib/providers/media/kie";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook do kie.ai (e futuros providers): recebe o resultado assíncrono e
 * delega pra processMediaRunResult (download → Storage → MediaAsset → post).
 */
export async function POST(request: Request) {
  const env = serverEnv();
  const provider = getMediaProvider();
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const result: KieWebhookParsed =
    "parseWebhook" in provider
      ? (provider.parseWebhook(payload) as KieWebhookParsed)
      : { externalTaskId: "", status: "failed", mediaUrls: [], error: "provider sem parser" };

  // Auth: HMAC do kie.ai quando configurado; senão, secret na callback URL.
  if (env.KIE_WEBHOOK_HMAC_KEY && provider.name === "kie") {
    const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
    const signature = request.headers.get("x-webhook-signature") ?? "";
    const kie = provider as KieMediaProvider;
    if (!result.externalTaskId || !timestamp || !signature ||
        !kie.verifyWebhookSignature(result.externalTaskId, timestamp, signature)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (env.MEDIA_WEBHOOK_SECRET) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.MEDIA_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (!isDevBypass()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!result.externalTaskId) {
    return NextResponse.json({ error: "sem taskId" }, { status: 400 });
  }

  // Estados intermediários (waiting/generating): ack sem tocar no run.
  if (result.pending) return NextResponse.json({ ok: true, pending: true });

  const run = await findPipelineRunByExternalTaskId(result.externalTaskId);
  if (!run) {
    // Task desconhecida — ack pra não receber retries eternos.
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (run.status === "done") {
    return NextResponse.json({ ok: true, duplicate: true }); // idempotente
  }

  const outcome = await processMediaRunResult(run, result);
  return NextResponse.json({ ok: true, done: outcome.done, error: outcome.error });
}
