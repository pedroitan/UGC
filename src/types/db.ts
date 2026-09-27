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
