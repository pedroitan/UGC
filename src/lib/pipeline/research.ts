import "server-only";

import Parser from "rss-parser";
import {
  insertPautas,
  listKeywords,
  listPautas,
  listSources,
  logResearchRun,
} from "@/lib/db";
import { getSearchProvider } from "@/lib/providers";
import type { SearchResultItem } from "@/lib/providers/types";
import type { PautaRow } from "@/types/db";
import { clusterNews, titleTokens, jaccard, type DedupItem } from "./dedup";
import { keywordRelevance, scorePauta } from "./score";

export interface ResearchResult {
  fetched: number;
  created: number;
  provider: string;
}

const parser = new Parser();

async function fetchRssItems(url: string, sourceName: string): Promise<DedupItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 15).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? url,
      snippet: (item.contentSnippet ?? item.content ?? "").slice(0, 500),
      publishedAt: item.isoDate ?? item.pubDate,
      sourceName,
    }));
  } catch {
    return [];
  }
}

function googleNewsUrl(keywords: string[]): string {
  const q = encodeURIComponent(keywords.join(" OR "));
  return `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

/**
 * Pipeline de pesquisa: busca na web + fontes → dedup → score → grava pautas.
 * Chamado por POST /api/research (e futuramente pelo radar automático, P1).
 */
export async function runResearch(workspaceId: string): Promise<ResearchResult> {
  const [keywords, sources, existing] = await Promise.all([
    listKeywords(workspaceId),
    listSources(workspaceId),
    listPautas(workspaceId, "new"),
  ]);

  const include = keywords.filter((k) => k.kind === "include");
  const exclude = keywords.filter((k) => k.kind === "exclude");
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const items: DedupItem[] = [];

  // 1) Busca na web via SearchProvider
  const provider = getSearchProvider();
  if (include.length > 0 && provider.name !== "mock") {
    const results = await provider.search({
      keywords: include.map((k) => k.term),
      excludeKeywords: exclude.map((k) => k.term),
      language: "pt-BR",
      region: "br",
      since,
      maxResults: 15,
    });
    items.push(
      ...results.map((r: SearchResultItem) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        publishedAt: r.publishedAt,
        sourceName: r.sourceName,
      })),
    );
  }

  // 2) Fontes cadastradas: RSS/sites e Google Notícias
  const excludeTerms = exclude.map((k) => k.term.toLowerCase());
  for (const source of sources.filter((s) => s.active)) {
    if (source.type === "google_news") {
      if (include.length === 0) continue;
      items.push(...(await fetchRssItems(googleNewsUrl(include.map((k) => k.term)), source.name ?? "Google Notícias")));
    } else if ((source.type === "rss" || source.type === "site") && source.url) {
      items.push(...(await fetchRssItems(source.url, source.name ?? source.url)));
    }
  }

  const filtered = items.filter(
    (i) =>
      i.title &&
      !excludeTerms.some((t) => `${i.title} ${i.snippet}`.toLowerCase().includes(t)),
  );

  // 3) Dedup interno + dedup contra pautas já existentes
  const clusters = clusterNews(filtered);
  const existingTokens = existing.map((p) => titleTokens(p.title));
  const fresh = clusters.filter(
    (c) => !existingTokens.some((t) => jaccard(titleTokens(c.representative.title), t) >= 0.55),
  );

  // 4) Score + persistência
  const includeWeighted = include.map((k) => ({ term: k.term, weight: k.weight }));
  const pautas: Omit<PautaRow, "id" | "created_at">[] = fresh.map((cluster) => {
    const rep = cluster.representative;
    const text = `${rep.title} ${rep.snippet}`;
    const oldest = cluster.items
      .map((i) => i.publishedAt)
      .filter((d): d is string => Boolean(d))
      .sort()[0];
    return {
      workspace_id: workspaceId,
      cluster_id: null,
      title: rep.title,
      summary: rep.snippet || null,
      source_urls: cluster.items.map((i) => i.url),
      citations: cluster.items.map((i) => ({
        url: i.url,
        snippet: i.snippet.slice(0, 500),
        published_at: i.publishedAt,
        source_name: i.sourceName,
      })),
      published_at: rep.publishedAt ?? oldest ?? null,
      score: scorePauta({
        relevance: keywordRelevance(text, includeWeighted),
        publishedAt: rep.publishedAt ?? oldest ?? null,
        sourceCount: cluster.items.length,
      }),
      status: "new",
      embedding: null,
    };
  });

  const created = pautas.length ? await insertPautas(pautas) : 0;

  await logResearchRun(
    workspaceId,
    {
      include: include.map((k) => k.term),
      exclude: exclude.map((k) => k.term),
      sources: sources.filter((s) => s.active).map((s) => ({ type: s.type, url: s.url })),
    },
    { fetched: filtered.length, clusters: clusters.length, created },
    provider.name,
  );

  return { fetched: filtered.length, created, provider: provider.name };
}
