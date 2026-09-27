import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// OAuth da Meta — Instagram Business Login (escopos instagram_business_*).
// Docs: Instagram API with Instagram Login / Content Publishing.

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const GRAPH_URL = "https://graph.instagram.com/v24.0";

export const META_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
].join(",");

// --- state assinado (previne CSRF e carrega o workspace) --------------------

interface MetaState {
  w: string; // workspace id
  n: string; // nonce
  exp: number; // epoch ms
}

export function signMetaState(workspaceId: string, secret: string): string {
  const payload: MetaState = {
    w: workspaceId,
    n: randomBytes(8).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMetaState(
  state: string,
  secret: string,
  now = Date.now(),
): { workspaceId: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as MetaState;
    if (payload.exp < now || !payload.w) return null;
    return { workspaceId: payload.w };
  } catch {
    return null;
  }
}

// --- fluxo OAuth --------------------------------------------------------------

export function buildAuthorizeUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("state", input.state);
  return url.toString();
}

const shortLivedSchema = z.object({
  access_token: z.string(),
  user_id: z.number().or(z.string()),
});

/** Troca o `code` do callback por um token curto (~1 h). */
export async function exchangeCodeForToken(input: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
    code: input.code,
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`Meta token exchange falhou: ${res.status}`);
  const parsed = shortLivedSchema.parse(await res.json());
  return { accessToken: parsed.access_token, userId: String(parsed.user_id) };
}

const longLivedSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

/** Troca o token curto por um de longa duração (~60 dias). */
export async function exchangeForLongLivedToken(input: {
  appSecret: string;
  accessToken: string;
}): Promise<{ accessToken: string; expiresAt: Date }> {
  const url = new URL(LONG_LIVED_URL);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("access_token", input.accessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta long-lived exchange falhou: ${res.status}`);
  const parsed = longLivedSchema.parse(await res.json());
  return {
    accessToken: parsed.access_token,
    expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
  };
}

const profileSchema = z.object({
  user_id: z.string().or(z.number()),
  username: z.string().optional(),
  account_type: z.string().optional(),
});

export async function fetchIgProfile(accessToken: string): Promise<{
  userId: string;
  username: string | null;
  accountType: string | null;
}> {
  const url = new URL(`${GRAPH_URL}/me`);
  url.searchParams.set("fields", "user_id,username,account_type");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta profile falhou: ${res.status}`);
  const parsed = profileSchema.parse(await res.json());
  return {
    userId: String(parsed.user_id),
    username: parsed.username ?? null,
    accountType: parsed.account_type ?? null,
  };
}
