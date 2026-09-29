import "server-only";

import { getPost, insertPipelineRunReturning, updatePipelineRun } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { getMediaProvider } from "@/lib/providers";
import type { PostRow } from "@/types/db";

function artPrompt(post: PostRow): string {
  const slides = (post.script as { slides?: { title?: string }[] }).slides;
  const topic = slides?.[0]?.title?.trim() || post.caption?.trim() || "cultura e música";
  // Regra de produto: a IA gera só fundo/ilustração — nunca texto.
  return [
    `Editorial background illustration for a social media post about: ${topic}.`,
    "Clean modern editorial art direction, rich texture, strong focal point,",
    "suitable as background for typography overlay.",
    "No text, no words, no letters, no logos, no watermark.",
  ].join(" ");
}

/**
 * Dispara geração assíncrona de arte de fundo pro post (stage "media").
 * O resultado chega por POST /api/webhooks/media — esta função nunca espera.
 */
export async function requestPostArt(postId: string): Promise<{ taskId: string }> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post não encontrado");

  const env = serverEnv();
  const provider = getMediaProvider();

  const run = await insertPipelineRunReturning({
    post_id: post.id,
    workspace_id: post.workspace_id,
    stage: "media",
    input: { kind: "image", prompt: artPrompt(post) },
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
      prompt: (run.input as { prompt: string }).prompt,
      width: 1080,
      height: story ? 1920 : 1350,
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
