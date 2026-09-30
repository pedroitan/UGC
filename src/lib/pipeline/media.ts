import "server-only";

import {
  findRunningMediaRunByPost,
  getPost,
  insertMediaAsset,
  insertPipelineRunReturning,
  updatePipelineRun,
  updatePostScript,
} from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";
import { serverEnv } from "@/lib/env";
import { getMediaProvider } from "@/lib/providers";
import type { KieWebhookParsed } from "@/lib/providers/media/kie";
import { createAdminClient } from "@/lib/supabase/server";
import type { PipelineRunRow, PostRow } from "@/types/db";

const MAX_MEDIA_BYTES = 30 * 1024 * 1024; // 30MB

function postSourceImage(post: PostRow): string | undefined {
  const meta = (post.script as { _meta?: { image?: string } })._meta;
  return meta?.image?.startsWith("https://") ? meta.image : undefined;
}

function artPrompt(post: PostRow, hasReference: boolean): string {
  const slides = (post.script as { slides?: { title?: string }[] }).slides;
  const topic = slides?.[0]?.title?.trim() || post.caption?.trim() || "cultura e música";
  // Regra de produto: a IA gera só fundo/ilustração — nunca texto.
  const base = [
    `Editorial background illustration for a social media post about: ${topic}.`,
    "Clean modern editorial art direction, rich texture, strong focal point,",
    "suitable as background for typography overlay.",
    "No text, no words, no letters, no logos, no watermark.",
  ];
  if (hasReference) {
    base.unshift(
      "Use the reference image as the visual base — keep the main subject and composition,",
      "restyle it into clean editorial cover art.",
    );
  }
  return base.join(" ");
}

/**
 * Dispara geração assíncrona de arte de fundo pro post (stage "media").
 * Se o post tem foto da fonte, ela vai como imagem de referência (image-to-image).
 * O resultado chega por POST /api/webhooks/media — esta função nunca espera.
 */
export async function requestPostArt(postId: string): Promise<{ taskId: string }> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post não encontrado");

  const env = serverEnv();
  const provider = getMediaProvider();
  const reference = postSourceImage(post);
  const prompt = artPrompt(post, Boolean(reference));

  const run = await insertPipelineRunReturning({
    post_id: post.id,
    workspace_id: post.workspace_id,
    stage: "media",
    input: { kind: "image", prompt, reference: reference ?? null },
    output: {},
    provider: provider.name,
    external_task_id: null,
    status: "running",
    cost: 0,
  });

  try {
    const story = post.format === "story" || post.format === "reel";
    const callback = new URL("/api/webhooks/media", env.NEXT_PUBLIC_APP_URL);
    if (env.MEDIA_WEBHOOK_SECRET) callback.searchParams.set("secret", env.MEDIA_WEBHOOK_SECRET);

    const task = await provider.createTask({
      kind: "image",
      prompt,
      width: 1080,
      height: story ? 1920 : 1350,
      ...(reference ? { referenceImageUrls: [reference] } : {}),
      callbackUrl: callback.toString(),
    });
    await updatePipelineRun(run.id, { external_task_id: task.externalTaskId });
    return { taskId: task.externalTaskId };
  } catch (e) {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: e instanceof Error ? e.message : "falhou" },
    });
    throw e;
  }
}

/** URL de mídia segura pra baixar: https e host do provedor/CDN conhecido. */
function isAllowedMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    return (
      host.endsWith(".kie.ai") ||
      host === "kie.ai" ||
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

/**
 * Processa o resultado de uma task de mídia (webhook ou sync manual):
 * baixa as URLs do provedor, copia pro Storage, grava MediaAsset e
 * seta _meta.image no post. Idempotente — run done não reprocessa.
 */
export async function processMediaRunResult(
  run: PipelineRunRow,
  result: KieWebhookParsed,
): Promise<{ done: boolean; error?: string }> {
  if (run.status === "done") return { done: true }; // idempotente

  if (result.status === "failed" || result.mediaUrls.length === 0) {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: result.error ?? "geração falhou", credits: result.credits },
      cost: result.credits ?? 0,
    });
    return { done: false, error: result.error ?? "geração falhou" };
  }

  const urls = result.mediaUrls.filter(isAllowedMediaUrl);
  if (urls.length === 0) {
    await updatePipelineRun(run.id, {
      status: "failed",
      output: { error: "resultado sem URLs válidas" },
    });
    return { done: false, error: "resultado sem URLs válidas" };
  }

  const providerName = run.provider ?? "kie";
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
          provider: providerName,
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
      output: { error: "falha ao copiar mídia para o Storage" },
    });
    return { done: false, error: "falha ao copiar mídia" };
  }

  // Arte gerada vira a "foto" do post — os templates e o toggle já aproveitam.
  if (run.post_id && storedUrls[0]) {
    const post = await getPost(run.post_id);
    if (post) {
      const script = post.script as Record<string, unknown>;
      const meta = (script._meta ?? {}) as Record<string, unknown>;
      await updatePostScript(post.id, {
        ...script,
        _meta: { ...meta, image: storedUrls[0], imageSource: providerName, useImage: true },
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
  return { done: true };
}

/**
 * Recupera runs "running" cujo callback do webhook não chegou (secret ausente,
 * deploy atrasado etc.): consulta o recordInfo do provedor e processa.
 */
export async function syncPostMedia(postId: string): Promise<{ synced: boolean; pending: boolean }> {
  const run = await findRunningMediaRunByPost(postId);
  if (!run?.external_task_id) return { synced: false, pending: false };

  const provider = getMediaProvider();
  if (!("getTaskResult" in provider)) return { synced: false, pending: true };

  const result = await (provider as { getTaskResult(id: string): Promise<KieWebhookParsed> })
    .getTaskResult(run.external_task_id);
  if (result.pending) return { synced: false, pending: true };

  const outcome = await processMediaRunResult(run, result);
  return { synced: outcome.done, pending: false };
}
