// Score de pauta: relevância às keywords × frescor × autoridade × engajamento.
// Função pura e determinística (testável); o LLM pode refinar depois.

export interface ScoreInput {
  /** 0..1 — proporção ponderada de keywords presentes no título/summary. */
  relevance: number;
  /** Data de publicação da pauta (mais antiga possível do cluster). */
  publishedAt?: string | null;
  /** 0..1 — autoridade da fonte principal (padrão 0.6). */
  authority?: number;
  /** Nº de fontes/fontes do cluster que cobrem a mesma notícia. */
  sourceCount?: number;
  /** true quando a pauta tem foto da matéria — postável sem geração de arte. */
  hasImage?: boolean;
  now?: Date;
}

const WEIGHTS = {
  relevance: 0.4,
  freshness: 0.25,
  authority: 0.12,
  engagement: 0.13,
  media: 0.1,
};

/** Decaimento exponencial: ~1h ≈ 0.92, 24h ≈ 0.37, 72h ≈ 0.05. */
export function freshness(publishedAt: string | null | undefined, now = new Date()): number {
  if (!publishedAt) return 0.4;
  const ageHours = Math.max(0, (now.getTime() - new Date(publishedAt).getTime()) / 3_600_000);
  return Math.exp(-ageHours / 24);
}

/** Contagem de fontes como proxy de potencial de engajamento. */
function engagement(sourceCount: number): number {
  return Math.min(1, sourceCount / 4);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function scorePauta(input: ScoreInput): number {
  const score =
    100 *
    (WEIGHTS.relevance * clamp01(input.relevance) +
      WEIGHTS.freshness * freshness(input.publishedAt, input.now) +
      WEIGHTS.authority * clamp01(input.authority ?? 0.6) +
      WEIGHTS.engagement * engagement(input.sourceCount ?? 1) +
      WEIGHTS.media * (input.hasImage ? 1 : 0));
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Relevância = keywords incluídas encontradas no texto (peso pela `weight`). */
export function keywordRelevance(
  text: string,
  includeTerms: { term: string; weight: number }[],
): number {
  if (includeTerms.length === 0) return 0.5;
  const haystack = text.toLowerCase();
  let matched = 0;
  let total = 0;
  for (const k of includeTerms) {
    total += k.weight;
    if (haystack.includes(k.term.toLowerCase())) matched += k.weight;
  }
  return total === 0 ? 0.5 : clamp01(matched / total) * 1.2 > 1 ? 1 : (matched / total) * 1.2;
}
