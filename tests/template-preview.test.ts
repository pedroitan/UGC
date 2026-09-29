import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import satori from "satori";
import { getTemplate, SLIDE_SIZES } from "../src/lib/render/templates";
import { loadFonts } from "../src/lib/render/fonts";
import { svgToPng } from "../src/lib/render";

describe("expo preview", () => {
  it("gera PNG de exemplo", async () => {
    const fonts = await loadFonts();
    // foto fake: PNG colorido embutido como data URI
    const fakePhoto = `data:image/png;base64,${svgToPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#7A8B99"/><circle cx="400" cy="240" r="120" fill="#4A5568"/><rect x="280" y="360" width="240" height="240" fill="#2D3748"/></svg>',
      800,
    ).toString("base64")}`;
    const slide = {
      n: 1,
      total: 4,
      eyebrow: "NOVA TEMPORADA",
      title: "Festival de verão anuncia lineup completo",
      body: "Organização confirma três dias de shows e venda de ingressos a partir da próxima semana.",
      handle: "@pauta",
      accent: "#3ECF4E",
      image: fakePhoto,
    };
    const tpl = getTemplate("expo");
    for (const [name, size] of [["feed", SLIDE_SIZES.carousel], ["story", SLIDE_SIZES.story]] as const) {
      const svg = await satori(tpl.render(slide, size), { ...size, fonts });
      writeFileSync(`/tmp/expo-${name}.png`, svgToPng(svg, size.width));
    }
    expect(true).toBe(true);
  });
});
