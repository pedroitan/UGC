import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DEV_USER, DEV_WORKSPACE, isDevBypass } from "@/lib/dev-auth";
import { createClient } from "@/lib/supabase/server";
import type { BrandKitRow, SocialAccountRow, WorkspaceRow } from "@/types/db";

// Helpers tipados até gerarmos `database.types.ts` via `supabase gen types`
// (requer o banco local rodando). Casts ficam confinados neste módulo.

async function currentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  if (isDevBypass()) return DEV_USER;
  return currentUser();
}

export async function getOrCreateWorkspace(): Promise<WorkspaceRow | null> {
  if (isDevBypass()) return DEV_WORKSPACE;
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar workspace: ${error.message}`);
  if (data) return data as unknown as WorkspaceRow;

  // Fallback caso o trigger do signup ainda não tenha rodado.
  const { data: created, error: insertError } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name: "Meu workspace" })
    .select("*")
    .single();
  if (insertError) throw new Error(`Erro ao criar workspace: ${insertError.message}`);
  return created as unknown as WorkspaceRow;
}

export async function getBrandKit(workspaceId: string): Promise<BrandKitRow | null> {
  if (isDevBypass()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar Brand Kit: ${error.message}`);
  return (data as unknown as BrandKitRow | null) ?? null;
}

export async function upsertBrandKit(
  workspaceId: string,
  values: Omit<BrandKitRow, "id" | "workspace_id" | "created_at" | "updated_at">,
): Promise<BrandKitRow> {
  if (isDevBypass()) {
    // Sem banco no modo dev: valida e devolve o payload sem persistir.
    return {
      id: "dev",
      workspace_id: workspaceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...values,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .upsert({ workspace_id: workspaceId, ...values }, { onConflict: "workspace_id" })
    .select("*")
    .single();
  if (error) throw new Error(`Erro ao salvar Brand Kit: ${error.message}`);
  return data as unknown as BrandKitRow;
}

export async function listSocialAccounts(workspaceId: string): Promise<SocialAccountRow[]> {
  if (isDevBypass()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, workspace_id, channel, external_id, handle, token_expires_at, metadata, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Erro ao listar contas: ${error.message}`);
  return (data ?? []) as unknown as SocialAccountRow[];
}

export async function upsertSocialAccount(
  supabase: SupabaseClient,
  values: {
    workspace_id: string;
    channel: string;
    external_id: string;
    handle: string | null;
    access_token_encrypted: string;
    token_expires_at: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("social_accounts").upsert(values, {
    onConflict: "workspace_id,channel,external_id",
  });
  if (error) throw new Error(`Erro ao salvar conta social: ${error.message}`);
}
