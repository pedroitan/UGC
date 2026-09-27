import { z } from "zod";
import type { SearchProvider, SearchQuery, SearchResultItem } from "../types";

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().default(""),
        url: z.string(),
        content: z.string().default(""),
        published_date: z.string().optional(),
      }),
    )
    .default([]),
});

export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily";

  constructor(private apiKey: string) {}

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const q = query.keywords.join(" ");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: q,
        max_results: query.maxResults ?? 10,
        search_depth: "basic",
        topic: "news",
        include_answer: false,
        ...(query.since ? { days: daysSince(query.since) } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Tavily falhou: ${res.status}`);
    const parsed = responseSchema.parse(await res.json());
    const excluded = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());
    return parsed.results
      .filter((r) => {
        const text = `${r.title} ${r.content}`.toLowerCase();
        return !excluded.some((k) => text.includes(k));
      })
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        publishedAt: r.published_date,
        sourceName: hostname(r.url),
      }));
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function daysSince(iso: string): number {
  const days = Math.ceil((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return Math.max(1, Math.min(days, 30));
}
