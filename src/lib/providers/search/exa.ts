import { z } from "zod";
import type { SearchProvider, SearchQuery, SearchResultItem } from "../types";

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().default(""),
        url: z.string(),
        text: z.string().default(""),
        publishedDate: z.string().optional(),
      }),
    )
    .default([]),
});

export class ExaSearchProvider implements SearchProvider {
  readonly name = "exa";

  constructor(private apiKey: string) {}

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        query: query.keywords.join(" "),
        numResults: query.maxResults ?? 10,
        type: "auto",
        ...(query.since ? { startPublishedDate: query.since } : {}),
        contents: { text: { maxCharacters: 800 } },
      }),
    });
    if (!res.ok) throw new Error(`Exa falhou: ${res.status}`);
    const parsed = responseSchema.parse(await res.json());
    const excluded = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());
    return parsed.results
      .filter((r) => {
        const text = `${r.title} ${r.text}`.toLowerCase();
        return !excluded.some((k) => text.includes(k));
      })
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.text,
        publishedAt: r.publishedDate,
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
