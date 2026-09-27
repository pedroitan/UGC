import "server-only";

import {
  getBrandKit,
  getPauta,
  insertPipelineRun,
  insertPost,
  updatePautaStatus,
} from "@/lib/db";
import { getLLMProvider } from "@/lib/providers";
import type { BrandKitRow, PautaRow, PostFormat, PostRow } from "@/types/db";
import { maxSimilarityToSources } from "./similarity";

export interface Slide {
  title: string;
  body: string;
}

export interface GeneratedScript {
  slides?: Slide[];
  headline?: string;
  body?: string;
  screens?: { headline: string; body: string; cta: string }[];
  scenes?: { t: string; text: string; visual: string }[];
  duration_s?: number;
  caption: string;
  hashtags: string[];
  alt_text: string;
  source_credit: string;
}

const SLIDES_SCHEMA = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
      },
    },
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    alt_text: { type: "string" },
  },
  required: ["slides", "caption", "hashtags", "alt_text"],
};

const FORMAT_INSTRUCTIONS: Record<PostFormat, string> = {
  carousel:
    "Crie um carrossel de 5 a 8 slides: slide 1 = gancho forte, slides do meio = 3 a 6 pontos, último = CTA. Cada slide tem title (máx. 60 chars) e body (máx. 160 chars).",
  feed: "Crie um card de feed: headline (máx. 80 chars) e body (máx. 200 chars), em slides com 1 item.",
  story:
    "Crie 1 a 3 telas de story: headline curta, body de apoio e cta (ex.: 'link na bio'), em slides.",
  reel:
    "Crie um roteiro de reel de 15 a 45 s: 4 a 6 cenas em slides com title = texto na tela e body = indicação visual/B-roll.",
};

function buildPrompt(pauta: PautaRow, kit: BrandKitRow | null, format: PostFormat): {
  system: string;
  prompt: string;
} {
  const tone = kit?.voice_tone ? `Tom de voz: ${kit.voice_tone}.` : "";
  const neverUse = kit?.never_use?.length ? `Nunca usar: ${kit.never_use.join(", ")}.` : "";
  const examples = kit?.voice_examples?.length
    ? `Exemplos de estilo da marca:\n${kit.voice_examples.join("\n---\n")}`
    : "";
  const citations = pauta.citations
    .map((c) => `- ${c.source_name ?? c.url}: ${c.snippet}`)
    .join("\n");

  return {
    system: `Você é o redator do Instagram da marca ${kit?.handle ?? ""}. ${tone} ${neverUse} ${examples}
Regras: português do Brasil; nunca copie trechos da fonte (reescreva com suas palavras); fatos (datas, números, nomes) devem vir das fontes citadas; responda só via JSON.`,
    prompt: `Pauta: ${pauta.title}
Resumo: ${pauta.summary ?? ""}
Fontes:
${citations}

${FORMAT_INSTRUCTIONS[format]}
Além disso gere: caption (legenda até 2.200 chars, com crédito da fonte ao final), hashtags (5 a 15, começando com #) e alt_text (descrição acessível da imagem).`,
  };
}

// Fallback determinístico quando o LLM é mock ou falha — garante fluxo ponta a ponta.
function fallbackScript(pauta: PautaRow, format: PostFormat): GeneratedScript {
  const base = pauta.summary ?? "";
  const slides: Slide[] =
    format === "reel"
      ? [
          { title: pauta.title, body: "Abertura: contexto em 3 s" },
          { title: "O que aconteceu", body: base.slice(0, 120) },
          { title: "Por que importa", body: "Impacto para o público da marca" },
          { title: "Salve para ver depois", body: "Siga para mais novidades" },
        ]
      : format === "story"
        ? [
            { title: pauta.title, body: "Toque para saber mais — link na bio" },
            { title: "Resumo", body: base.slice(0, 140) },
          ]
        : [
            { title: pauta.title, body: "O essencial em poucos slides" },
            { title: "Contexto", body: base.slice(0, 160) },
            { title: "Detalhes", body: "Veja a matéria completa na fonte citada." },
            { title: "Salve e compartilhe", body: "Marque quem precisa saber disso." },
          ];

  return {
    slides,
    caption: `${pauta.title}\n\n${base}\n\nFonte: ${pauta.source_urls[0] ?? ""}`,
    hashtags: ["#news", "#pauta"],
    alt_text: `Card com a manchete: ${pauta.title}`,
    source_credit: pauta.source_urls[0] ?? "",
  };
}

function scriptToText(script: GeneratedScript): string {
  const parts = [
    script.caption,
    script.alt_text,
    ...(script.slides ?? []).flatMap((s) => [s.title, s.body]),
  ];
  return parts.filter(Boolean).join(" ");
}

export async function generatePost(
  workspaceId: string,
  pautaId: string,
  format: PostFormat,
): Promise<PostRow> {
  const [pauta, kit] = await Promise.all([getPauta(pautaId), getBrandKit(workspaceId)]);
  if (!pauta) throw new Error("Pauta não encontrada");
  if (pauta.workspace_id !== workspaceId) throw new Error("Pauta de outro workspace");

  const llm = getLLMProvider();
  const { system, prompt } = buildPrompt(pauta, kit, format);

  let script: GeneratedScript;
  let providerName = "fallback";
  let cost = 0;
  let runStatus: "done" | "failed" = "done";
  let llmRaw: unknown = null;

  if (llm.name !== "mock") {
    try {
      const result = await llm.complete({
        system,
        prompt,
        jsonSchema: SLIDES_SCHEMA,
        maxTokens: 2048,
      });
      llmRaw = result.json;
      cost = result.costUsd ?? 0;
      providerName = llm.name;
      script = normalizeScript(result.json, pauta);
    } catch {
      runStatus = "failed";
      script = fallbackScript(pauta, format);
    }
  } else {
    script = fallbackScript(pauta, format);
  }

  const similarity = maxSimilarityToSources(
    scriptToText(script),
    pauta.citations.map((c) => c.snippet),
  );

  const post = await insertPost({
    workspace_id: workspaceId,
    pauta_id: pauta.id,
    format,
    template_id: null,
    script: {
      ...script,
      _meta: { similarity, provider: providerName },
    } as Record<string, unknown>,
    caption: script.caption,
    hashtags: script.hashtags,
    alt_text: script.alt_text,
    status: "review",
  });

  await insertPipelineRun({
    post_id: post.id,
    workspace_id: workspaceId,
    stage: "script",
    input: { pauta_id: pautaId, format, prompt, system },
    output: { script, similarity, raw: llmRaw },
    provider: providerName,
    external_task_id: null,
    status: runStatus,
    cost,
  });

  await updatePautaStatus(pautaId, "used");
  return post;
}

function normalizeScript(json: unknown, pauta: PautaRow): GeneratedScript {
  const j = (json ?? {}) as Record<string, unknown>;
  const slides = Array.isArray(j.slides)
    ? (j.slides as { title?: string; body?: string }[])
        .filter((s) => s.title)
        .slice(0, 10)
        .map((s) => ({ title: String(s.title), body: String(s.body ?? "") }))
    : fallbackScript(pauta, "carousel").slides;
  return {
    slides,
    caption: typeof j.caption === "string" ? j.caption : `${pauta.title}\n\nFonte: ${pauta.source_urls[0] ?? ""}`,
    hashtags: Array.isArray(j.hashtags)
      ? (j.hashtags as string[]).slice(0, 15).map((h) => (h.startsWith("#") ? h : `#${h}`))
      : [],
    alt_text: typeof j.alt_text === "string" ? j.alt_text : `Card: ${pauta.title}`,
    source_credit: pauta.source_urls[0] ?? "",
  };
}
