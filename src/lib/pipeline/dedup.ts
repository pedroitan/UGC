// Deduplicação de notícias iguais em fontes diferentes.
// P0 usa similaridade de título (tokens) + mesmo domínio; clusterização por
// embedding entra quando escolhermos o provedor de embeddings (pgvector já está
// no schema — coluna pautas.embedding).

export interface DedupItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  sourceName?: string;
  /** Imagem da matéria (enclosure/media:content do RSS ou og:image). */
  imageUrl?: string;
}

export interface DedupCluster {
  representative: DedupItem;
  items: DedupItem[];
}

const STOPWORDS = new Set(
  "a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre ate até e ou mas nem que se como quando onde porque pois ja já mais menos muito muita ao aos à às".split(
    " ",
  ),
);

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Agrupa itens que contam a mesma notícia. Dois itens entram no mesmo cluster
 * se os títulos têm Jaccard >= threshold, ou se a URL é idêntica.
 */
export function clusterNews(items: DedupItem[], threshold = 0.55): DedupCluster[] {
  const clusters: DedupCluster[] = [];
  const tokenSets: Set<string>[] = [];

  for (const item of items) {
    const tokens = titleTokens(item.title);
    let placed = false;
    for (let i = 0; i < clusters.length; i++) {
      const rep = clusters[i].representative;
      const sameUrl =
        domain(item.url) !== "" &&
        domain(rep.url) !== "" &&
        item.url.replace(/\/$/, "") === rep.url.replace(/\/$/, "");
      if (sameUrl || jaccard(tokens, tokenSets[i]) >= threshold) {
        clusters[i].items.push(item);
        for (const t of tokens) tokenSets[i].add(t);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({ representative: item, items: [item] });
      tokenSets.push(new Set(tokens));
    }
  }
  return clusters;
}
