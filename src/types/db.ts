// Tipos das linhas das tabelas (espelha supabase/migrations). Regenerar com
// `supabase gen types` quando o banco local estiver rodando.

export type VoiceTone = "formal" | "informativo" | "descontraido" | "provocativo";

export interface BrandColor {
  name: string;
  hex: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  created_at: string;
}

export interface WorkspaceRow {
  id: string;
  owner_id: string;
  name: string;
  timezone: string;
  autopilot_config: Record<string, unknown>;
  created_at: string;
}

export interface BrandKitRow {
  id: string;
  workspace_id: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  colors: BrandColor[];
  font_title: string | null;
  font_body: string | null;
  voice_tone: VoiceTone | null;
  voice_examples: string[];
  never_use: string[];
  handle: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountRow {
  id: string;
  workspace_id: string;
  channel: string;
  external_id: string;
  handle: string | null;
  access_token_encrypted: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SourceType = "web_search" | "rss" | "site" | "google_news" | "trends";

export interface SourceRow {
  id: string;
  workspace_id: string;
  type: SourceType;
  url: string | null;
  name: string | null;
  active: boolean;
  created_at: string;
}

export type KeywordKind = "include" | "exclude";

export interface KeywordRow {
  id: string;
  workspace_id: string;
  term: string;
  kind: KeywordKind;
  weight: number;
  created_at: string;
}

export interface PautaCitation {
  url: string;
  snippet: string;
  published_at?: string;
  source_name?: string;
}

export type PautaStatus = "new" | "used" | "dismissed";

export interface PautaRow {
  id: string;
  workspace_id: string;
  cluster_id: string | null;
  title: string;
  summary: string | null;
  source_urls: string[];
  citations: PautaCitation[];
  published_at: string | null;
  score: number | null;
  status: PautaStatus;
  embedding: number[] | null;
  created_at: string;
}

export type PostFormat = "carousel" | "feed" | "story" | "reel";
export type PostStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "assisted";

export interface PostRow {
  id: string;
  workspace_id: string;
  pauta_id: string | null;
  format: PostFormat;
  template_id: string | null;
  script: Record<string, unknown>;
  caption: string | null;
  hashtags: string[];
  alt_text: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

export type PipelineStage = "research" | "script" | "media" | "render";
export type PipelineStatus = "pending" | "running" | "done" | "failed";

export interface PipelineRunRow {
  id: string;
  post_id: string | null;
  workspace_id: string;
  stage: PipelineStage;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  provider: string | null;
  external_task_id: string | null;
  status: PipelineStatus;
  cost: number;
  created_at: string;
}

export type MediaAssetType = "image" | "video" | "cover" | "audio";

export interface MediaAssetRow {
  id: string;
  post_id: string;
  workspace_id: string;
  order: number;
  type: MediaAssetType;
  url: string | null;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  provider: string | null;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  workspace_id: string | null;
  format: PostFormat;
  name: string;
  jsx_source: string;
  slots: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
}
