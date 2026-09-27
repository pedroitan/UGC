# Regras do projeto para agentes (Devin e outros)

Leia `docs/PRD.md` antes de qualquer tarefa. Ele é a fonte da verdade para escopo, prioridades (P0/P1/P2), modelo de dados e arquitetura. Se algo no pedido contradizer o PRD, pergunte antes de implementar.

## Arquitetura: decisões fechadas

- **Só Vercel + Supabase.** Não criar servidor de workers, Redis, BullMQ, Railway ou fila externa.
- Pesquisa e geração rodam **sob demanda** em route handlers (`POST /api/research`, `POST /api/generate`), com `maxDuration` explícito.
- Agendamento: **Vercel Cron** declarado em `vercel.json` — `/api/cron/publish` a cada minuto e `/api/cron/daily` 1x por dia. Proteger as rotas de cron com `CRON_SECRET`.
- Publicação duplicada é proibida: use `SELECT … FOR UPDATE SKIP LOCKED` (ou função RPC equivalente) ao pegar itens de `Schedule`.
- Geração de mídia (kie.ai / Higgsfield) é **assíncrona por webhook** (`POST /api/webhooks/media`). Nunca esperar a mídia dentro de uma função. Copiar todo arquivo recebido para o Supabase Storage (o kie.ai apaga em ~14 dias).
- Provedores sempre atrás de interfaces em `src/lib/providers/`: `SearchProvider`, `LLMProvider`, `MediaProvider`, `ChannelAdapter`. Trocar provedor não pode exigir mudança no pipeline.
- Cada etapa do pipeline grava um `PipelineRun` (input, output, provider, custo). "Pedir ajuste à IA" refaz só a etapa necessária.

## Regras de produto que não podem ser quebradas

- Instagram **somente pela API oficial da Meta** (Graph API / Content Publishing). Nunca usar bibliotecas que imitam o app (ex.: instagrapi).
- O **texto dos slides é sempre renderizado pelo template** (Satori). A IA de imagem gera só fundo/ilustração, nunca texto.
- Reescrita original: nenhum parágrafo copiado da fonte; guardar a similaridade e o crédito da fonte.
- Consultar `content_publishing_limit` antes de agendar; carrossel via API tem no máximo 10 itens; story via API não aceita stickers (vira "publicação assistida").
- Aprovação humana é o padrão. Publicar sem revisão só com opt-in explícito do usuário.
- Cobrança/créditos **não** entram no MVP; apenas registrar `cost` em `PipelineRun`.

## Convenções

- TypeScript estrito, sem `any` sem justificativa.
- Validação de entrada com Zod em toda rota.
- Segredos só em variáveis de ambiente (ver `.env.example`); tokens da Meta criptografados no banco.
- Interface em pt-BR; textos em arquivo de mensagens para facilitar i18n.
- Visual: seguir `docs/design/` (tokens em `docs/design/README.md`).
- Cada PR: descrição do que mudou, como testar, e checklist do critério de pronto da fase.
- Testes: unitários para score, dedup, limites da API e montagem do payload da Meta; um teste de ponta a ponta do fluxo pauta → post aprovado com provedores mockados.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
