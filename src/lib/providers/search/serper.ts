import { z } from "zod";
import type { SearchProvider, SearchQuery, SearchResultItem } from "../types";

const responseSchema = z.object({
  news: z
    .array(
      z.object({
        title: z.string().default(""),
        link: z.string(),
        snippet: z.string().default(""),
        date: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .default([]),
});

export class SerperSearchProvider implements SearchProvider {
  readonly name = "serper";

  constructor(private apiKey: string) {}

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        q: query.keywords.join(" "),
        gl: "br",
        hl: "pt-br",
        num: query.maxResults ?? 10,
      }),
    });
    if (!res.ok) throw new Error(`Serper falhou: ${res.status}`);
    const parsed = responseSchema.parse(await res.json());
    const excluded = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());
    return parsed.news
      .filter((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return !excluded.some((k) => text.includes(k));
      })
      .map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        publishedAt: r.date,
        sourceName: r.source ?? hostname(r.link),
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
