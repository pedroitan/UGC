import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getOrCreateWorkspace } from "@/lib/db";
import { generatePost } from "@/lib/pipeline/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  pautaId: z.string().min(1),
  format: z.enum(["carousel", "feed", "story", "reel"]),
});

/** Botão "Gerar": roteiro + legenda + hashtags; grava Post em revisão. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const workspace = await getOrCreateWorkspace();
  if (!workspace) return NextResponse.json({ error: "no workspace" }, { status: 400 });

  try {
    const post = await generatePost(workspace.id, parsed.data.pautaId, parsed.data.format);
    return NextResponse.json({ postId: post.id, status: post.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generate failed" },
      { status: 500 },
    );
  }
}
