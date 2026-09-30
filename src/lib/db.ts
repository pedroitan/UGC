import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DEV_USER, DEV_WORKSPACE, isDevBypass } from "@/lib/dev-auth";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { devId, getDevStore } from "@/lib/dev-store";
import type {
  BrandKitRow,
  KeywordKind,
  KeywordRow,
  MediaAssetRow,
  PautaRow,
  PautaStatus,
  PipelineRunRow,
  PipelineStage,
  PostRow,
  PostStatus,
  SocialAccountRow,
  SourceRow,
  SourceType,
  WorkspaceRow,
} from "@/types/db";

// Helpers tipados até gerarmos `database.types.ts` via `supabase gen types`
// (requer o banco local rodando). Casts ficam confinados neste módulo.

async function currentUser(): Promise<User | null> {
  // Sem credenciais do Supabase (deploy sem envs), trata como deslogado —
  // o proxy redireciona para /login em vez de quebrar a página.
  const env = serverEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
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

// --- Keywords ----------------------------------------------------------------

export async function listKeywords(workspaceId: string): Promise<KeywordRow[]> {
  if (isDevBypass()) return getDevStore().keywords;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keywords")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Erro ao listar palavras-chave: ${error.message}`);
  return (data ?? []) as unknown as KeywordRow[];
}

export async function addKeyword(
  workspaceId: string,
  term: string,
  kind: KeywordKind,
): Promise<void> {
  if (isDevBypass()) {
    const store = getDevStore();
    if (!store.keywords.some((k) => k.term.toLowerCase() === term.toLowerCase())) {
      store.keywords.push({
        id: devId(), workspace_id: workspaceId, term, kind, weight: 1,
        created_at: new Date().toISOString(),
      });
    }
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("keywords")
    .upsert({ workspace_id: workspaceId, term, kind }, { onConflict: "workspace_id,term" });
  if (error) throw new Error(`Erro ao salvar palavra-chave: ${error.message}`);
}

export async function deleteKeyword(id: string): Promise<void> {
  if (isDevBypass()) {
    const store = getDevStore();
    store.keywords = store.keywords.filter((k) => k.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("keywords").delete().eq("id", id);
  if (error) throw new Error(`Erro ao remover palavra-chave: ${error.message}`);
}

// --- Fontes --------------------------------------------------------------------

export async function listSources(workspaceId: string): Promise<SourceRow[]> {
  if (isDevBypass()) return getDevStore().sources;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Erro ao listar fontes: ${error.message}`);
  return (data ?? []) as unknown as SourceRow[];
}

export async function addSource(
  workspaceId: string,
  input: { type: SourceType; url: string | null; name: string | null },
): Promise<void> {
  if (isDevBypass()) {
    getDevStore().sources.push({
      id: devId(), workspace_id: workspaceId, active: true,
      created_at: new Date().toISOString(), ...input,
    });
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .insert({ workspace_id: workspaceId, ...input });
  if (error) throw new Error(`Erro ao salvar fonte: ${error.message}`);
}

export async function toggleSource(id: string, active: boolean): Promise<void> {
  if (isDevBypass()) {
    const s = getDevStore().sources.find((x) => x.id === id);
    if (s) s.active = active;
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sources").update({ active }).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar fonte: ${error.message}`);
}

export async function deleteSource(id: string): Promise<void> {
  if (isDevBypass()) {
    const store = getDevStore();
    store.sources = store.sources.filter((x) => x.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sources").delete().eq("id", id);
  if (error) throw new Error(`Erro ao remover fonte: ${error.message}`);
}

// --- Pautas ------------------------------------------------------------------

export async function listPautas(
  workspaceId: string,
  status: PautaStatus = "new",
): Promise<PautaRow[]> {
  if (isDevBypass()) {
    return getDevStore()
      .pautas.filter((p) => p.status === status)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pautas")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", status)
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Erro ao listar pautas: ${error.message}`);
  return (data ?? []) as unknown as PautaRow[];
}

export async function getPauta(id: string): Promise<PautaRow | null> {
  if (isDevBypass()) {
    return getDevStore().pautas.find((p) => p.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pautas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar pauta: ${error.message}`);
  return (data as unknown as PautaRow | null) ?? null;
}

export async function insertPautas(pautas: Omit<PautaRow, "id" | "created_at">[]): Promise<number> {
  if (isDevBypass()) {
    const store = getDevStore();
    for (const p of pautas) {
      store.pautas.unshift({ ...p, id: devId(), created_at: new Date().toISOString() });
    }
    return pautas.length;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pautas").insert(pautas);
  if (error) throw new Error(`Erro ao salvar pautas: ${error.message}`);
  return pautas.length;
}

export async function updatePautaStatus(id: string, status: PautaStatus): Promise<void> {
  if (isDevBypass()) {
    const p = getDevStore().pautas.find((x) => x.id === id);
    if (p) p.status = status;
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pautas").update({ status }).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar pauta: ${error.message}`);
}

// --- Posts -------------------------------------------------------------------

export async function listPosts(
  workspaceId: string,
  statuses?: PostStatus[],
): Promise<PostRow[]> {
  if (isDevBypass()) {
    return getDevStore()
      .posts.filter((p) => !statuses || statuses.includes(p.status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (statuses?.length) query = query.in("status", statuses);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar posts: ${error.message}`);
  return (data ?? []) as unknown as PostRow[];
}

export async function getPost(id: string): Promise<PostRow | null> {
  if (isDevBypass()) {
    return getDevStore().posts.find((p) => p.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar post: ${error.message}`);
  return (data as unknown as PostRow | null) ?? null;
}

export async function insertPost(
  values: Omit<PostRow, "id" | "created_at" | "updated_at">,
): Promise<PostRow> {
  const now = new Date().toISOString();
  if (isDevBypass()) {
    const post: PostRow = { ...values, id: devId(), created_at: now, updated_at: now };
    getDevStore().posts.unshift(post);
    return post;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").insert(values).select("*").single();
  if (error) throw new Error(`Erro ao criar post: ${error.message}`);
  return data as unknown as PostRow;
}

export async function updatePostScript(
  id: string,
  script: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  if (isDevBypass()) {
    const p = getDevStore().posts.find((x) => x.id === id);
    if (p) {
      p.script = script;
      p.updated_at = now;
    }
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ script, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar script do post: ${error.message}`);
}

export async function updatePostContent(
  id: string,
  patch: Partial<Pick<PostRow, "caption" | "hashtags" | "alt_text">>,
): Promise<void> {
  const now = new Date().toISOString();
  if (isDevBypass()) {
    const p = getDevStore().posts.find((x) => x.id === id);
    if (p) Object.assign(p, patch, { updated_at: now });
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ ...patch, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar post: ${error.message}`);
}

export async function updatePostStatus(id: string, status: PostStatus): Promise<void> {
  const now = new Date().toISOString();
  if (isDevBypass()) {
    const p = getDevStore().posts.find((x) => x.id === id);
    if (p) {
      p.status = status;
      p.updated_at = now;
    }
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar post: ${error.message}`);
}

// --- Media assets --------------------------------------------------------------

export async function listMediaAssets(postId: string): Promise<MediaAssetRow[]> {
  if (isDevBypass()) {
    return getDevStore()
      .assets.filter((a) => a.post_id === postId)
      .sort((a, b) => a.order - b.order);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("post_id", postId)
    .order("order", { ascending: true });
  if (error) throw new Error(`Erro ao listar assets: ${error.message}`);
  return (data ?? []) as unknown as MediaAssetRow[];
}

export async function getMediaAsset(id: string): Promise<MediaAssetRow | null> {
  if (isDevBypass()) {
    return getDevStore().assets.find((a) => a.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar asset: ${error.message}`);
  return (data as unknown as MediaAssetRow | null) ?? null;
}

export async function insertMediaAsset(
  values: Omit<MediaAssetRow, "id" | "created_at">,
  png?: Buffer,
): Promise<MediaAssetRow> {
  if (isDevBypass()) {
    const store = getDevStore();
    const asset: MediaAssetRow = {
      ...values,
      id: devId(),
      created_at: new Date().toISOString(),
    };
    if (png) {
      asset.url = `/api/media/${asset.id}`;
      store.blobs.set(asset.id, png);
    }
    store.assets.push(asset);
    return asset;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .insert(values)
    .select("*")
    .single();
  if (error) throw new Error(`Erro ao salvar asset: ${error.message}`);
  return data as unknown as MediaAssetRow;
}

/** PNG guardado em memória no modo dev (servido por /api/media/[id]). */
export function getDevMediaBlob(id: string): Buffer | null {
  if (!isDevBypass()) return null;
  return getDevStore().blobs.get(id) ?? null;
}

export async function deleteMediaAssets(postId: string): Promise<void> {
  if (isDevBypass()) {
    const store = getDevStore();
    for (const a of store.assets.filter((x) => x.post_id === postId)) {
      store.blobs.delete(a.id);
    }
    store.assets = store.assets.filter((x) => x.post_id !== postId);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("media_assets").delete().eq("post_id", postId);
  if (error) throw new Error(`Erro ao remover assets: ${error.message}`);
}

// --- PipelineRun ---------------------------------------------------------------

export async function insertPipelineRun(
  values: Omit<PipelineRunRow, "id" | "created_at">,
): Promise<void> {
  if (isDevBypass()) {
    getDevStore().runs.push({ ...values, id: devId(), created_at: new Date().toISOString() });
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_runs").insert(values);
  if (error) throw new Error(`Erro ao salvar PipelineRun: ${error.message}`);
}

export async function updatePipelineRun(
  id: string,
  patch: Partial<Pick<PipelineRunRow, "output" | "status" | "cost" | "external_task_id">>,
): Promise<void> {
  if (isDevBypass()) {
    const r = getDevStore().runs.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_runs").update(patch).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar PipelineRun: ${error.message}`);
}

export async function findRunningMediaRunByPost(
  postId: string,
): Promise<PipelineRunRow | null> {
  if (isDevBypass()) {
    return (
      getDevStore().runs.find(
        (r) => r.post_id === postId && r.stage === "media" &&
          (r.status === "running" || r.status === "pending"),
      ) ?? null
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("post_id", postId)
    .eq("stage", "media")
    .in("status", ["running", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar PipelineRun: ${error.message}`);
  return (data as unknown as PipelineRunRow | null) ?? null;
}

export async function findPipelineRunByExternalTaskId(
  externalTaskId: string,
): Promise<PipelineRunRow | null> {
  if (isDevBypass()) {
    return getDevStore().runs.find((r) => r.external_task_id === externalTaskId) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("external_task_id", externalTaskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar PipelineRun: ${error.message}`);
  return (data as unknown as PipelineRunRow | null) ?? null;
}

export async function insertPipelineRunReturning(
  values: Omit<PipelineRunRow, "id" | "created_at">,
): Promise<PipelineRunRow> {
  if (isDevBypass()) {
    const run: PipelineRunRow = { ...values, id: devId(), created_at: new Date().toISOString() };
    getDevStore().runs.push(run);
    return run;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .insert(values)
    .select("*")
    .single();
  if (error) throw new Error(`Erro ao salvar PipelineRun: ${error.message}`);
  return data as unknown as PipelineRunRow;
}

// --- Pesquisa: rascunho de PipelineRun sem post (stage=research) --------------
export async function logResearchRun(
  workspaceId: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  provider: string,
  cost = 0,
): Promise<void> {
  await insertPipelineRun({
    post_id: null,
    workspace_id: workspaceId,
    stage: "research" as PipelineStage,
    input,
    output,
    provider,
    external_task_id: null,
    status: "done",
    cost,
  });
}
