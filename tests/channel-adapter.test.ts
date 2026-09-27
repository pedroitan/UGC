import { describe, expect, it } from "vitest";
import { MockChannelAdapter } from "@/lib/providers/mock";
import type { PublishablePost } from "@/lib/providers/types";

const adapter = new MockChannelAdapter();

function post(overrides: Partial<PublishablePost>): PublishablePost {
  return {
    id: "p1",
    format: "carousel",
    caption: "legenda",
    media: [{ url: "https://x/img.png", type: "image" }],
    ...overrides,
  };
}

describe("validação do ChannelAdapter (limites da API do Instagram)", () => {
  it("rejeita carrossel com menos de 2 itens", () => {
    const r = adapter.validate(post({ media: [{ url: "u", type: "image" }] }));
    expect(r.valid).toBe(false);
  });

  it("rejeita carrossel com mais de 10 itens", () => {
    const media = Array.from({ length: 11 }, () => ({ url: "u", type: "image" as const }));
    const r = adapter.validate(post({ media }));
    expect(r.valid).toBe(false);
  });

  it("aceita carrossel de 3 a 10 itens", () => {
    const media = Array.from({ length: 7 }, () => ({ url: "u", type: "image" as const }));
    expect(adapter.validate(post({ media })).valid).toBe(true);
  });

  it("rejeita legenda acima de 2.200 caracteres", () => {
    const r = adapter.validate(post({ caption: "x".repeat(2201) }));
    expect(r.valid).toBe(false);
  });
});
