import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron 1x/dia: renova tokens de 60 dias e coleta métricas.
 * F0: retorna 200 sem fazer nada.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  if (!isCronAuthorized(request, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
