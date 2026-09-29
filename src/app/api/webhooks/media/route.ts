import { NextResponse } from "next/server";
import {
  findPipelineRunByExternalTaskId,
  getPost,
  insertMediaAsset,
  updatePipelineRun,
  updatePostScript,
} from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";
import { serverEnv } from "@/lib/env";
import { getMediaProvider } from "@/lib/providers";
import type { KieMediaProvider, KieWebhookParsed } from "@/lib/providers/media/kie";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MEDIA_BYTES = 30 * 1024 * 1024; // 30MB

/** URL de mídia segura pra baixar: https e host do provedor/CDN conhecido. */
function isAllowedMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    // kie.ai serve resultados em CDNs próprios/tempfile; manter lista curta.
    return (
      host.endsWith(".kie.ai") ||
      host === "kie.ai" ||
      host.endsWith(".tempfile.aiquickdraw.com") ||
      host.endsWith(".aiquickdraw.com") ||
      host.endsWith(".r2.dev") ||
      host.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

function extFromContentType(ct: string | null): string {
  if (!ct) return "bin";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  return "bin";
}

async function fetchMedia(url: string): Promise<{ bytes: Buffer; contentType: string | null } | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_MEDIA_BYTES) return null;
  return { bytes: buf, contentType: res.headers.get("content-type") };
}

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

  if (result.status === "failed") {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: result.error ?? "geração falhou", raw: payload },
      cost: result.credits ?? 0,
    });
    return NextResponse.json({ ok: true, failed: true });
  }

  // Sucesso: baixa cada mídia do kie.ai (expira em ~14d) e copia pro Storage.
  const urls = result.mediaUrls.filter(isAllowedMediaUrl);
  if (urls.length === 0) {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: "resultado sem URLs válidas", raw: payload },
    });
    return NextResponse.json({ ok: true, failed: true });
  }

  const assetIds: string[] = [];
  const storedUrls: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const media = await fetchMedia(urls[i]);
    if (!media) continue;
    const ext = extFromContentType(media.contentType);
    const type = media.contentType?.startsWith("video/")
      ? "video"
      : media.contentType?.startsWith("audio/")
        ? "audio"
        : "image";

    let publicUrl: string | null = null;
    if (!isDevBypass()) {
      const supabase = createAdminClient();
      const path = `${run.workspace_id}/${run.post_id ?? "shared"}/gen-${result.externalTaskId}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, media.bytes, { upsert: true, contentType: media.contentType ?? undefined });
      if (error) continue;
      publicUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    }

    if (run.post_id) {
      const asset = await insertMediaAsset(
        {
          post_id: run.post_id,
          workspace_id: run.workspace_id,
          order: 100 + i, // arte gerada fica depois dos slides renderizados
          type,
          url: publicUrl,
          width: null,
          height: null,
          duration_s: null,
          provider: provider.name,
        },
        type === "image" ? media.bytes : undefined,
      );
      assetIds.push(asset.id);
      storedUrls.push(asset.url ?? publicUrl ?? "");
    }
  }

  if (storedUrls.length === 0) {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: "falha ao copiar mídia para o Storage", raw: payload },
    });
    return NextResponse.json({ ok: true, failed: true });
  }

  // Arte gerada vira a "foto" do post — os templates e o toggle já aproveitam.
  if (run.post_id && storedUrls[0]) {
    const post = await getPost(run.post_id);
    if (post) {
      const script = post.script as Record<string, unknown>;
      const meta = (script._meta ?? {}) as Record<string, unknown>;
      await updatePostScript(post.id, {
        ...script,
        _meta: { ...meta, image: storedUrls[0], imageSource: "kie", useImage: true },
      });
    }
  }

  await updatePipelineRun(run.id, {
    status: "done",
    output: {
      asset_ids: assetIds,
      media_urls: storedUrls,
      provider_urls: result.mediaUrls,
      credits: result.credits,
    },
    cost: result.credits ?? 0,
  });

  return NextResponse.json({ ok: true });
}
