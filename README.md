# Pauta (nome provisório)

App web que transforma notícias e tendências de um nicho em posts prontos para o Instagram (carrossel, feed, story e reel), com a identidade da marca, e agenda a publicação pela API oficial da Meta. O humano revisa e aprova.

- Produto e escopo: [`docs/PRD.md`](docs/PRD.md)
- Telas de referência: [`docs/design/`](docs/design/)
- Regras para agentes (Devin): [`AGENTS.md`](AGENTS.md)
- Roteiros de sessão por fase: [`docs/sessions/`](docs/sessions/)

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres + pgvector, Auth, Storage) · Vercel Pro (funções + Cron) · Claude API · Tavily/Exa (busca na web) · kie.ai (imagem, vídeo, TTS; Higgsfield como alternativa) · Satori + resvg (render de imagem).

## Rodando localmente

Pré-requisitos: Node.js 20.9+, pnpm 10, Docker Desktop (para o Supabase local).

```bash
cp .env.example .env.local   # preencha as chaves
pnpm install
pnpm supabase start          # sobe Postgres, Auth, Storage etc. e imprime as chaves locais
pnpm db:migrate              # aplica as migrations
pnpm dev
```

O `supabase start` imprime `API URL` e `anon key`/`service_role key` — use-as em
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
no `.env.local`.

Gere `TOKEN_ENCRYPTION_KEY` com `openssl rand -base64 32` e um `CRON_SECRET` aleatório.

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe o Next.js em desenvolvimento |
| `pnpm build` / `pnpm start` | Build e start de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript estrito |
| `pnpm test` | Testes unitários (Vitest) |
| `pnpm supabase <cmd>` | CLI do Supabase |
| `pnpm db:migrate` / `pnpm db:reset` | Aplica/recria migrations no banco local |

## Autenticação e Instagram

- Login por e-mail/senha e Google (Supabase Auth). O signup cria `public.users` +
  um `Workspace` padrão via trigger (`handle_new_user`).
- "Conectar Instagram" em Configurações → `/api/auth/meta` inicia o OAuth da Meta
  (Instagram Business Login, escopos `instagram_business_*`). O token de 60 dias é
  guardado criptografado (AES-256-GCM) em `social_accounts`.
- Para o OAuth funcionar localmente, cadastre `http://localhost:3000/api/auth/meta/callback`
  como redirect URI no app da Meta e preencha `META_APP_ID`/`META_APP_SECRET`.

## Cron

`vercel.json` declara `/api/cron/publish` (a cada minuto) e `/api/cron/daily`
(1x/dia), protegidos por `Authorization: Bearer $CRON_SECRET`. Em F0 retornam 200
sem efeito; a publicação real entra em F3 (com `claim_due_schedules()` —
`FOR UPDATE SKIP LOCKED`).
