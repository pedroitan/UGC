import "server-only";

import type { User } from "@supabase/supabase-js";
import type { WorkspaceRow } from "@/types/db";

// Modo dev: navegação sem Supabase. Nunca ativa em build de produção,
// mesmo que a variável vaze — serve só para desenvolvimento local.
export function isDevBypass(): boolean {
  return (
    process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production"
  );
}

export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "admin@pauta.local",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

export const DEV_WORKSPACE: WorkspaceRow = {
  id: "00000000-0000-0000-0000-000000000001",
  owner_id: DEV_USER.id,
  name: "Workspace dev",
  timezone: "America/Sao_Paulo",
  autopilot_config: {},
  created_at: new Date().toISOString(),
};
