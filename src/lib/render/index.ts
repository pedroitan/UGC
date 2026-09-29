import "server-only";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { BrandKitRow, KeywordRow, PostRow } from "@/types/db";
import { loadFonts } from "./fonts";
import {
  DEFAULT_TEMPLATE,
  SLIDE_SIZES,
  accentColor,
  getTemplate,
  resolveHandle,
  type SlideInput,
} from "./templates";

export {
  DEFAULT_TEMPLATE,
  SLIDE_SIZES,
  TEMPLATES,
  TOKENS,
  accentColor,
  getTemplate,
  resolveHandle,
} from "./templates";

// Pré-carrega as fontes já na inicialização do módulo (cold start da lambda):
// a leitura dos woff roda em paralelo com auth/consultas do primeiro request,
// e fica pronta para todos os usuários seguintes.
void loadFonts().catch(() => undefined);

export interface SlideContent {
  title: string;
  body: string;
  cta?: string;
}

/** Extrai os slides do script do post (todas as fontes normalizam p/ slides). */
export function getSlides(post: PostRow): SlideContent[] {
  const raw = (post.script as { slides?: { title?: string; body?: string; cta?: string }[] })
    .slides;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.title === "string")
    .slice(0, 10)
    .map((s) => ({ title: String(s.title), body: String(s.body ?? ""), cta: s.cta }));
}

export function getTemplateKey(post: PostRow): string {
  const meta = (post.script as { _meta?: { template?: string } })._meta;
  return meta?.template ?? DEFAULT_TEMPLATE;
}

/** Eyebrow do slide: keywords de inclusão do workspace (ex.: "MÚSICA · SALVADOR"). */
export function eyebrowFor(keywords: KeywordRow[]): string {
  const terms = keywords
    .filter((k) => k.kind === "include")
    .slice(0, 2)
    .map((k) => k.term.toUpperCase());
  return terms.length ? terms.join(" · ") : "PAUTA";
}

export function buildSlideInput(
  post: PostRow,
  index: number,
  kit: BrandKitRow | null,
  keywords: KeywordRow[],
): SlideInput | null {
  const slides = getSlides(post);
  const s = slides[index];
  if (!s) return null;
  const meta = post.script as { _meta?: { image?: string; useImage?: boolean } };
  return {
    n: index + 1,
    total: slides.length,
    eyebrow: eyebrowFor(keywords),
    title: s.title,
    body: s.body,
    cta: s.cta,
    handle: resolveHandle(kit),
    accent: accentColor(kit),
    image: meta._meta?.useImage === false ? undefined : meta._meta?.image,
  };
}

export async function renderSlide(
  post: PostRow,
  index: number,
  kit: BrandKitRow | null,
  keywords: KeywordRow[],
  templateKey?: string,
): Promise<{ svg: string; width: number; height: number } | null> {
  const input = buildSlideInput(post, index, kit, keywords);
  if (!input) return null;
  const size = SLIDE_SIZES[post.format];
  const template = getTemplate(templateKey ?? getTemplateKey(post));
  const fonts = await loadFonts();
  const opts = { width: size.width, height: size.height, fonts };
  let svg: string;
  try {
    svg = await satori(template.render(input, size), opts);
  } catch {
    // Imagem remota pode falhar (hotlink/offline) — refaz sem ela.
    svg = await satori(template.render({ ...input, image: undefined }, size), opts);
  }
  return { svg, ...size };
}

/** Rasteriza o SVG em PNG via resvg (texto já sai como path do satori). */
export function svgToPng(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}
