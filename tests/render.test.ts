import { describe, expect, it } from "vitest";
import {
  buildSlideInput,
  eyebrowFor,
  getSlides,
  getTemplateKey,
  renderSlide,
} from "@/lib/render";
import { DEFAULT_TEMPLATE, SLIDE_SIZES, TEMPLATES } from "@/lib/render/templates";
import type { KeywordRow, PostRow } from "@/types/db";

function post(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: "p1",
    workspace_id: "w1",
    pauta_id: null,
    format: "carousel",
    template_id: null,
    script: {
      slides: [
        { title: "Título do slide 1", body: "Corpo do slide 1" },
        { title: "Título do slide 2", body: "" },
      ],
      _meta: { template: "papel" },
    },
    caption: "Legenda",
    hashtags: ["#teste"],
    alt_text: null,
    status: "review",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const keywords: KeywordRow[] = [
  { id: "k1", workspace_id: "w1", term: "música", kind: "include", weight: 1, created_at: "" },
  { id: "k2", workspace_id: "w1", term: "Salvador", kind: "include", weight: 1, created_at: "" },
  { id: "k3", workspace_id: "w1", term: "política", kind: "exclude", weight: 1, created_at: "" },
];

describe("getSlides", () => {
  it("extrai slides e limita a 10", () => {
    const many = post({
      script: { slides: Array.from({ length: 15 }, (_, i) => ({ title: `S${i}` })) },
    });
    expect(getSlides(many)).toHaveLength(10);
  });

  it("ignora entradas sem título", () => {
    const p = post({ script: { slides: [{ body: "x" }, { title: "ok" }] } });
    expect(getSlides(p).map((s) => s.title)).toEqual(["ok"]);
  });
});

describe("eyebrowFor", () => {
  it("usa até 2 keywords de inclusão em maiúsculas", () => {
    expect(eyebrowFor(keywords)).toBe("MÚSICA · SALVADOR");
  });
  it("cai para PAUTA sem keywords", () => {
    expect(eyebrowFor([])).toBe("PAUTA");
  });
});

describe("templates", () => {
  it("tem 4 templates registrados e default válido", () => {
    expect(TEMPLATES).toHaveLength(4);
    expect(TEMPLATES.some((t) => t.key === DEFAULT_TEMPLATE)).toBe(true);
  });

  it("lê o template do _meta do script", () => {
    expect(getTemplateKey(post())).toBe("papel");
    expect(getTemplateKey(post({ script: {} }))).toBe(DEFAULT_TEMPLATE);
  });

  it("buildSlideInput monta n/total/eyebrow/handle", () => {
    const input = buildSlideInput(post(), 1, null, keywords);
    expect(input).toMatchObject({
      n: 2,
      total: 2,
      eyebrow: "MÚSICA · SALVADOR",
      title: "Título do slide 2",
      handle: "@suamarca",
    });
    expect(buildSlideInput(post(), 9, null, keywords)).toBeNull();
  });
});

describe("renderSlide", () => {
  it("gera SVG 1080x1350 para carrossel", async () => {
    const out = await renderSlide(post(), 0, null, keywords);
    expect(out).not.toBeNull();
    expect(out!.svg).toContain("<svg");
    expect(out!.svg).toContain(`width="${SLIDE_SIZES.carousel.width}"`);
    expect(out!.width).toBe(1080);
    expect(out!.height).toBe(1350);
  }, 20000);

  it("gera SVG 1080x1920 para story em todos os templates", async () => {
    const p = post({ format: "story" });
    for (const t of TEMPLATES) {
      const withTpl = post({
        format: "story",
        script: { slides: [{ title: "T", body: "B" }], _meta: { template: t.key } },
      });
      const out = await renderSlide(withTpl, 0, null, []);
      expect(out?.height).toBe(1920);
      expect(out?.svg).toContain("<svg");
    }
    expect(p.format).toBe("story");
  }, 60000);
});
