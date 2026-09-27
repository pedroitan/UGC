import { describe, expect, it } from "vitest";
import { freshness, keywordRelevance, scorePauta } from "@/lib/pipeline/score";

const now = new Date("2026-09-27T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe("score de pauta", () => {
  it("pauta quente: relevante + fresca + várias fontes → > 80", () => {
    const score = scorePauta({
      relevance: 1,
      publishedAt: hoursAgo(1),
      authority: 0.9,
      sourceCount: 4,
      now,
    });
    expect(score).toBeGreaterThan(80);
  });

  it("pauta morna: pouco relevante + velha → < 50", () => {
    const score = scorePauta({
      relevance: 0.2,
      publishedAt: hoursAgo(96),
      authority: 0.4,
      sourceCount: 1,
      now,
    });
    expect(score).toBeLessThan(50);
  });

  it("sempre dentro de 0–100", () => {
    const hi = scorePauta({ relevance: 1, publishedAt: hoursAgo(0), authority: 1, sourceCount: 10, now });
    const lo = scorePauta({ relevance: 0, publishedAt: hoursAgo(720), authority: 0, sourceCount: 0, now });
    expect(hi).toBeLessThanOrEqual(100);
    expect(lo).toBeGreaterThanOrEqual(0);
  });

  it("frescor decai com o tempo", () => {
    expect(freshness(hoursAgo(1), now)).toBeGreaterThan(freshness(hoursAgo(48), now));
    expect(freshness(null, now)).toBe(0.4);
  });

  it("relevância por keywords", () => {
    const kws = [
      { term: "música", weight: 1 },
      { term: "festival", weight: 1 },
    ];
    expect(keywordRelevance("Festival de música em Salvador", kws)).toBe(1);
    expect(keywordRelevance("texto sem nada", kws)).toBe(0);
    expect(keywordRelevance("qualquer", [])).toBe(0.5);
  });
});
