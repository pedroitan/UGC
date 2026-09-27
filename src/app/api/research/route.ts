import { NextResponse } from "next/server";
import { getCurrentUser, getOrCreateWorkspace } from "@/lib/db";
import { runResearch } from "@/lib/pipeline/research";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Botão "Pesquisar agora": busca, deduplica, calcula score e grava pautas. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workspace = await getOrCreateWorkspace();
  if (!workspace) return NextResponse.json({ error: "no workspace" }, { status: 400 });

  try {
    const result = await runResearch(workspace.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "research failed" },
      { status: 500 },
    );
  }
}
