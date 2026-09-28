import "server-only";

import {
  deleteMediaAssets,
  getBrandKit,
  getPost,
  insertMediaAsset,
  insertPipelineRun,
  listKeywords,
} from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";
import { getSlides, getTemplateKey, renderSlide, svgToPng } from "@/lib/render";
import { createAdminClient } from "@/lib/supabase/server";
import type { MediaAssetRow } from "@/types/db";

/**
 * Renderiza todos os slides do post em PNG (stage "render") e grava
 * media_assets. Dev: bytes em memória servidos por /api/media/[id].
 * Prod: upload para o bucket `post-media` do Supabase Storage.
 */
export async function renderPostAssets(postId: string): Promise<MediaAssetRow[]> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post não encontrado");

  const [kit, keywords] = await Promise.all([
    getBrandKit(post.workspace_id),
    listKeywords(post.workspace_id),
  ]);

  await deleteMediaAssets(post.id);

  const slideCount = getSlides(post).length;
  const assets: MediaAssetRow[] = [];
  for (let i = 0; i < slideCount; i++) {
    const rendered = await renderSlide(post, i, kit, keywords);
    if (!rendered) continue;
    const png = svgToPng(rendered.svg, rendered.width);

    let url: string | null = null;
    if (!isDevBypass()) {
      const supabase = createAdminClient();
      const path = `${post.workspace_id}/${post.id}/slide-${i + 1}.png`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, png, { upsert: true, contentType: "image/png" });
      if (error) throw new Error(`Erro ao subir slide: ${error.message}`);
      url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    }

    assets.push(
      await insertMediaAsset(
        {
          post_id: post.id,
          workspace_id: post.workspace_id,
          order: i,
          type: "image",
          url,
          width: rendered.width,
          height: rendered.height,
          duration_s: null,
          provider: "satori+resvg",
        },
        png,
      ),
    );
  }

  await insertPipelineRun({
    post_id: post.id,
    workspace_id: post.workspace_id,
    stage: "render",
    input: { template: getTemplateKey(post), slides: slideCount },
    output: { asset_ids: assets.map((a) => a.id), count: assets.length },
    provider: "satori+resvg",
    external_task_id: null,
    status: assets.length === slideCount ? "done" : "failed",
    cost: 0,
  });

  return assets;
}
