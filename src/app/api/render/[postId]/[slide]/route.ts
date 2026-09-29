import { NextResponse } from "next/server";
import {
  getBrandKit,
  getCurrentUser,
  getOrCreateWorkspace,
  getPost,
  listKeywords,
} from "@/lib/db";
import { renderSlide, svgToPng, getTemplate } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Preview/entrega de slide renderizado pelo template (Satori).
 *   GET /api/render/<postId>/<index>        → SVG
 *   GET /api/render/<postId>/<index>?format=png → PNG (resvg)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string; slide: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { postId, slide } = await params;
  const index = Number.parseInt(slide.replace(/\.(svg|png)$/i, ""), 10);
  if (!Number.isInteger(index) || index < 0 || index > 9) {
    return NextResponse.json({ error: "invalid slide" }, { status: 400 });
  }

  const workspace = await getOrCreateWorkspace();
  const post = await getPost(postId);
  if (!workspace || !post || post.workspace_id !== workspace.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  // ?t=<key> = preview de template antes de salvar (seletor do Estúdio).
  const t = url.searchParams.get("t");
  const templateOverride = t && getTemplate(t).key === t ? t : undefined;

  const [kit, keywords] = await Promise.all([
    getBrandKit(workspace.id),
    listKeywords(workspace.id),
  ]);
  const rendered = await renderSlide(post, index, kit, keywords, templateOverride);
  if (!rendered) return NextResponse.json({ error: "no slide" }, { status: 404 });

  const wantsPng = url.searchParams.get("format") === "png";
  if (wantsPng) {
    return new Response(new Uint8Array(svgToPng(rendered.svg, rendered.width)), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  }
  return new Response(rendered.svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "no-store",
    },
  });
}
