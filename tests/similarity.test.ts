import { describe, expect, it } from "vitest";
import { maxSimilarityToSources, textSimilarity } from "@/lib/pipeline/similarity";

const source =
  "O festival de verão em Salvador divulgou nesta sexta-feira a programação completa do evento, que acontece em janeiro na orla da cidade, com ingressos à venda a partir da próxima semana.";

describe("similaridade da reescrita", () => {
  it("texto copiado → similaridade ~1", () => {
    expect(textSimilarity(source, source)).toBe(1);
  });

  it("texto reescrito → similaridade baixa (< 30%)", () => {
    const rewritten =
      "Saiu a grade do festival de verão: a festa ocupa a orla de Salvador em janeiro e as vendas abrem em breve.";
    expect(textSimilarity(rewritten, source)).toBeLessThan(0.3);
  });

  it("texto sem relação → 0", () => {
    expect(textSimilarity("receita de bolo de chocolate com cobertura", source)).toBe(0);
  });

  it("maxSimilarityToSources retorna o maior", () => {
    const sim = maxSimilarityToSources(source, ["nada a ver aqui hoje", source]);
    expect(sim).toBe(1);
  });

  it("textos curtos (< 8 palavras) → 0", () => {
    expect(textSimilarity("oi", source)).toBe(0);
  });
});
