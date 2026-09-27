import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, upsertSocialAccount } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { serverEnv } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchIgProfile,
  verifyMetaState,
} from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectToSettings(request: NextRequest, query: string) {
  return NextResponse.redirect(
    new URL(`/configuracoes?${query}`, request.nextUrl.origin),
  );
}

/** Callback do OAuth da Meta: troca o code, guarda o token criptografado. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const env = serverEnv();

  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    return redirectToSettings(request, "error=meta_not_configured");
  }

  const errorParam = searchParams.get("error") ?? searchParams.get("error_reason");
  if (errorParam) return redirectToSettings(request, `error=${errorParam}`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return redirectToSettings(request, "error=missing_params");

  const verified = verifyMetaState(state, env.META_APP_SECRET);
  const user = await getCurrentUser();
  if (!verified || !user) return redirectToSettings(request, "error=invalid_state");

  try {
    const shortLived = await exchangeCodeForToken({
      appId: env.META_APP_ID,
      appSecret: env.META_APP_SECRET,
      redirectUri: env.META_REDIRECT_URI,
      code,
    });
    const longLived = await exchangeForLongLivedToken({
      appSecret: env.META_APP_SECRET,
      accessToken: shortLived.accessToken,
    });
    const profile = await fetchIgProfile(longLived.accessToken);

    const supabase = await createClient();
    await upsertSocialAccount(supabase, {
      workspace_id: verified.workspaceId,
      channel: "instagram",
      external_id: profile.userId,
      handle: profile.username ? `@${profile.username}` : null,
      access_token_encrypted: encryptToken(
        longLived.accessToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
      token_expires_at: longLived.expiresAt.toISOString(),
      metadata: { account_type: profile.accountType },
    });
  } catch {
    return redirectToSettings(request, "error=meta_exchange_failed");
  }

  return redirectToSettings(request, "connected=instagram");
}
