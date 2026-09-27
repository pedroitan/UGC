import { redirect } from "next/navigation";
import { getOrCreateWorkspace, getPost, listPosts } from "@/lib/db";
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

  const posts = await listPosts(workspace.id, ["review", "approved"]);
  const postId = typeof params.post === "string" ? params.post : undefined;
  const selected = postId ? await getPost(postId) : (posts[0] ?? null);

  return <EstudioClient posts={posts} selected={selected} />;
}
