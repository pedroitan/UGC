import "server-only";

/** Rotas de cron são chamadas pelo Vercel Cron com `Authorization: Bearer CRON_SECRET`. */
export function isCronAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
