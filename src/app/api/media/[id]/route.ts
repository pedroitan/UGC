import { NextResponse } from "next/server";
import { getCurrentUser, getDevMediaBlob, getMediaAsset } from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Serve PNGs de media_assets. No modo dev os bytes ficam em memória; em
 * produção o `url` do asset aponta para o Supabase Storage e esta rota só
 * redireciona (ou 404 se o asset não existir).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await getMediaAsset(id);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (isDevBypass()) {
    const blob = getDevMediaBlob(id);
    if (!blob) return NextResponse.json({ error: "not found" }, { status: 404 });
    return new Response(new Uint8Array(blob), {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  }

  if (asset.url) return NextResponse.redirect(asset.url);
  return NextResponse.json({ error: "no content" }, { status: 404 });
}
