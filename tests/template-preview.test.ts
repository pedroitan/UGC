import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import satori from "satori";
import { getTemplate, SLIDE_SIZES } from "../src/lib/render/templates";
import { loadFonts } from "../src/lib/render/fonts";
import { svgToPng } from "../src/lib/render";

describe("moderno preview", () => {
  it("gera PNG de exemplo", async () => {
    const fonts = await loadFonts();
    const slide = {
      n: 1,
      total: 4,
      eyebrow: "NOVA TEMPORADA",
      title: "Festival de verão anuncia lineup completo",
      body: "Organização confirma três dias de shows e venda de ingressos a partir da próxima semana.",
      handle: "@pauta",
      accent: "#E4572E",
    };
    const tpl = getTemplate("moderno");
    for (const [name, size] of [["feed", SLIDE_SIZES.carousel], ["story", SLIDE_SIZES.story]] as const) {
      const svg = await satori(tpl.render(slide, size), { ...size, fonts });
      writeFileSync(`/tmp/moderno-${name}.png`, svgToPng(svg, size.width));
    }
    expect(true).toBe(true);
  });
});
