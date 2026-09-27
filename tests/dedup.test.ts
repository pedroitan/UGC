import { describe, expect, it } from "vitest";
import { clusterNews, jaccard, normalizeTitle, titleTokens } from "@/lib/pipeline/dedup";

const item = (title: string, url = "https://a.com/1", source = "a.com") => ({
  title,
  url,
  snippet: "trecho",
  sourceName: source,
});

describe("dedup de pautas", () => {
  it("normaliza título (acentos, pontuação, caixa)", () => {
    expect(normalizeTitle("Festival de Verão: Salvador!")).toBe("festival de verao salvador");
  });

  it("agrupa a mesma notícia em fontes diferentes", () => {
    const clusters = clusterNews([
      item("Festival de verão em Salvador divulga programação", "https://a.com/1"),
      item("Festival de verão em Salvador divulga programação completa", "https://b.com/2", "b.com"),
      item("Streaming testa novo pagamento a artistas", "https://c.com/3", "c.com"),
    ]);
    expect(clusters).toHaveLength(2);
    const big = clusters.find((c) => c.items.length === 2);
    expect(big?.items.map((i) => i.sourceName).sort()).toEqual(["a.com", "b.com"]);
  });

  it("agrupa URLs idênticas mesmo com títulos diferentes", () => {
    const clusters = clusterNews([
      item("Título A", "https://a.com/x"),
      item("Título B completamente diferente", "https://a.com/x", "b.com"),
    ]);
    expect(clusters).toHaveLength(1);
  });

  it("não agrupa notícias diferentes", () => {
    const clusters = clusterNews([
      item("Festival de verão anuncia line-up"),
      item("Prefeitura abre cadastro do Carnaval", "https://d.com/9"),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("jaccard básico", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(titleTokens("o a de").size).toBe(0);
  });
});
