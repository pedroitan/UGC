import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateWorkspace } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { buildAuthorizeUrl, signMetaState } from "@/lib/meta";

export const dynamic = "force-dynamic";

/** Inicia o OAuth do Instagram: redireciona para a Meta com state assinado. */
export async function GET(request: NextRequest) {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const env = serverEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/configuracoes?error=meta_not_configured", request.nextUrl.origin),
    );
  }

  const state = signMetaState(workspace.id, env.META_APP_SECRET);
  const url = buildAuthorizeUrl({
    appId: env.META_APP_ID,
    redirectUri: env.META_REDIRECT_URI,
    state,
  });
  return NextResponse.redirect(url);
}
