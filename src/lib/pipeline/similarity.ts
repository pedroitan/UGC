// Checagem de similaridade da reescrita: regra do PRD exige < 30% de sobreposição
// com o texto original. Mede a proporção de shingles de 8 palavras do texto
// gerado que aparecem na fonte.

export function wordShingles(text: string, n = 8): Set<string> {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const shingles = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) {
    shingles.add(words.slice(i, i + n).join(" "));
  }
  return shingles;
}

/** 0..1 — fração dos shingles do texto gerado presentes na fonte. */
export function textSimilarity(generated: string, source: string): number {
  const gen = wordShingles(generated);
  if (gen.size === 0) return 0;
  const src = wordShingles(source);
  let overlap = 0;
  for (const s of gen) if (src.has(s)) overlap++;
  return overlap / gen.size;
}

/** Similaridade contra várias fontes; retorna a maior. */
export function maxSimilarityToSources(generated: string, sources: string[]): number {
  let max = 0;
  for (const s of sources) {
    const sim = textSimilarity(generated, s);
    if (sim > max) max = sim;
  }
  return max;
}
