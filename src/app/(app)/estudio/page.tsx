import { redirect } from "next/navigation";
import {
  getBrandKit,
  getOrCreateWorkspace,
  getPauta,
  getPost,
  listMediaAssets,
  listPosts,
} from "@/lib/db";
import { TEMPLATES, getTemplateKey, resolveHandle } from "@/lib/render";
import { EstudioClient } from "./estudio-client";

export const dynamic = "force-dynamic";

export default async function EstudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const posts = await listPosts(workspace.id, ["review", "approved", "draft"]);
  const postId = typeof params.post === "string" ? params.post : undefined;
  const selected = postId ? await getPost(postId) : (posts[0] ?? null);

  const pauta = selected?.pauta_id ? await getPauta(selected.pauta_id) : null;
  const [assets, kit] = await Promise.all([
    selected ? listMediaAssets(selected.id) : Promise.resolve([]),
    getBrandKit(workspace.id),
  ]);

  return (
    <EstudioClient
      posts={posts}
      selected={selected}
      pauta={pauta ? { title: pauta.title, score: pauta.score } : null}
      assets={assets}
      templates={TEMPLATES.map((t) => ({ key: t.key, name: t.name, swatch: t.swatch }))}
      templateKey={selected ? getTemplateKey(selected) : null}
      handle={resolveHandle(kit)}
    />
  );
}
