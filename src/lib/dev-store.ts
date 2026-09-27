import "server-only";

import type {
  KeywordRow,
  PautaRow,
  PipelineRunRow,
  PostRow,
  SourceRow,
} from "@/types/db";
import { DEV_WORKSPACE } from "./dev-auth";

// Store em memória para o modo dev (DEV_AUTH_BYPASS). globalThis sobrevive a
// hot-reloads do Next dev server dentro do mesmo processo.

interface DevStore {
  keywords: KeywordRow[];
  sources: SourceRow[];
  pautas: PautaRow[];
  posts: PostRow[];
  runs: PipelineRunRow[];
}

const WS = DEV_WORKSPACE.id;
let seq = 0;
const id = () => `dev-${(++seq).toString(36)}-${Date.now().toString(36)}`;
export const devId = id;

function seedPauta(
  score: number,
  title: string,
  summary: string,
  meta: { source: string; minutesAgo: number; count: number },
): PautaRow {
  return {
    id: id(),
    workspace_id: WS,
    cluster_id: null,
    title,
    summary,
    source_urls: [`https://fonte.dev/${meta.source.toLowerCase().replaceAll(" ", "-")}`],
    citations: [
      {
        url: `https://fonte.dev/${meta.source.toLowerCase().replaceAll(" ", "-")}`,
        snippet: summary,
        published_at: new Date(Date.now() - meta.minutesAgo * 60_000).toISOString(),
        source_name: meta.source,
      },
    ],
    published_at: new Date(Date.now() - meta.minutesAgo * 60_000).toISOString(),
    score,
    status: "new",
    embedding: null,
    created_at: new Date().toISOString(),
  };
}

function seed(): DevStore {
  return {
    keywords: (
      [
        ["música", "include"],
        ["Salvador", "include"],
        ["festival", "include"],
        ["streaming", "include"],
        ["IA", "include"],
        ["política", "exclude"],
      ] as const
    ).map(([term, kind]) => ({
      id: id(),
      workspace_id: WS,
      term,
      kind,
      weight: 1,
      created_at: new Date().toISOString(),
    })),
    sources: (
      [
        ["Google Notícias", "google_news", null],
        ["Portal de cultura (RSS)", "rss", "https://portal.dev/feed.xml"],
        ["Revista de música (RSS)", "rss", "https://revista.dev/rss"],
        ["Google Trends BR", "trends", null],
      ] as const
    ).map(([name, type, url]) => ({
      id: id(),
      workspace_id: WS,
      type,
      url,
      name,
      active: true,
      created_at: new Date().toISOString(),
    })),
    pautas: [
      seedPauta(94, "Festival de verão em Salvador divulga programação completa",
        "Organização anuncia datas, local e atrações; venda de ingressos começa em breve.",
        { source: "Portal de cultura", minutesAgo: 40, count: 3 }),
      seedPauta(88, "Plataformas de streaming testam novo modelo de pagamento a artistas",
        "Mudança afeta faixas com poucas reproduções e reacende debate sobre remuneração.",
        { source: "Blog de tecnologia", minutesAgo: 120, count: 5 }),
      seedPauta(81, "IA na produção musical: gravadoras discutem regras de crédito",
        "Selos debatem como creditar faixas feitas com apoio de ferramentas de IA.",
        { source: "Revista de música", minutesAgo: 300, count: 2 }),
      seedPauta(72, "Busca por aulas de produção musical cresce no fim de semana",
        "Tendência em alta nas buscas relacionadas a cursos e workshops.",
        { source: "Google Trends BR", minutesAgo: 360, count: 1 }),
      seedPauta(64, "Prefeitura abre cadastro de blocos para o próximo Carnaval",
        "Inscrições online seguem abertas até a data definida no edital.",
        { source: "Portal de cultura", minutesAgo: 540, count: 2 }),
    ],
    posts: [],
    runs: [],
  };
}

const globalStore = globalThis as unknown as { __pautaDevStore?: DevStore };

export function getDevStore(): DevStore {
  globalStore.__pautaDevStore ??= seed();
  return globalStore.__pautaDevStore;
}
