import "server-only";

import type { CSSProperties, ReactNode } from "react";
import type { BrandKitRow, PostFormat } from "@/types/db";

// Tokens do design (docs/design/README.md)
export const TOKENS = {
  ink: "#17150F",
  paper: "#F6F3EE",
  surface: "#FFFFFF",
  line: "#E4DED3",
  muted: "#5E584C",
  accent: "#E4572E",
  accentStrong: "#9E3113",
  inkSoft: "#C9C2B4",
  accentSoft: "#F08A66",
};

export const SLIDE_SIZES: Record<PostFormat, { width: number; height: number }> = {
  carousel: { width: 1080, height: 1350 },
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  reel: { width: 1080, height: 1920 },
};

export interface SlideInput {
  n: number;
  total: number;
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
  handle: string;
  /** Cor de destaque (Brand Kit colors[0] ou TOKENS.accent). */
  accent: string;
  /** Foto da matéria de origem (og:image/enclosure), quando disponível. */
  image?: string;
}

export interface TemplateDef {
  key: string;
  name: string;
  /** Cor do thumbnail no seletor de templates. */
  swatch: string;
  render: (slide: SlideInput, size: { width: number; height: number }) => ReactNode;
}

const F = "Fraunces";
const M = "Manrope";

export function accentColor(kit: BrandKitRow | null): string {
  return kit?.colors?.[0]?.hex ?? TOKENS.accent;
}

export function resolveHandle(kit: BrandKitRow | null): string {
  return kit?.handle ? `@${kit.handle.replace(/^@/, "")}` : "@suamarca";
}

// --- Template 1: Manchete escura (fundo ink, número em destaque) --------------

function MancheteEscura(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 96 : 72;
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TOKENS.ink,
        color: "#FFFFFF",
        padding: pad,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 4,
          color: TOKENS.accentSoft,
        }}
      >
        <span>{slide.eyebrow}</span>
        <span style={{ color: TOKENS.inkSoft }}>
          {slide.n}/{slide.total}
        </span>
      </div>
      <span
        style={{
          fontFamily: F,
          fontSize: tall ? 220 : 180,
          fontWeight: 700,
          color: slide.accent,
          lineHeight: 1,
          marginTop: tall ? 72 : 48,
        }}
      >
        {String(slide.n).padStart(2, "0")}
      </span>
      <span
        style={{
          fontFamily: F,
          fontSize: tall ? 88 : 72,
          fontWeight: 600,
          lineHeight: 1.08,
          marginTop: 28,
        }}
      >
        {slide.title}
      </span>
      {slide.body && (
        <span
          style={{
            fontFamily: M,
            fontSize: tall ? 40 : 34,
            lineHeight: 1.45,
            color: TOKENS.line,
            marginTop: 32,
          }}
        >
          {slide.body}
        </span>
      )}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 28,
          color: TOKENS.inkSoft,
        }}
      >
        <span>{slide.handle}</span>
        {slide.total > 1 && slide.n < slide.total && <span>Arraste »</span>}
      </div>
    </div>
  );
}

// --- Template 2: Papel (fundo claro, editorial) --------------------------------

function Papel(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 96 : 72;
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TOKENS.paper,
        color: TOKENS.ink,
        padding: pad,
      }}
    >
      <div style={{ display: "flex", height: 10, width: 180, backgroundColor: slide.accent, borderRadius: 5 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 4,
          color: TOKENS.accentStrong,
          marginTop: 32,
        }}
      >
        <span>{slide.eyebrow}</span>
        <span style={{ color: TOKENS.muted }}>
          {slide.n}/{slide.total}
        </span>
      </div>
      <span
        style={{
          fontFamily: F,
          fontSize: tall ? 96 : 78,
          fontWeight: 700,
          lineHeight: 1.06,
          marginTop: tall ? 80 : 56,
        }}
      >
        {slide.title}
      </span>
      {slide.body && (
        <span
          style={{
            fontFamily: M,
            fontSize: tall ? 42 : 36,
            lineHeight: 1.5,
            color: TOKENS.muted,
            marginTop: 36,
          }}
        >
          {slide.body}
        </span>
      )}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: M,
          fontSize: 28,
          color: TOKENS.muted,
          borderTop: `2px solid ${TOKENS.line}`,
          paddingTop: 28,
        }}
      >
        <span style={{ fontWeight: 700 }}>{slide.handle}</span>
        <span>
          {slide.n}/{slide.total}
        </span>
      </div>
    </div>
  );
}

// --- Template 3: Destaque (fundo accent, CTA escuro) ----------------------------

function Destaque(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 96 : 72;
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: slide.accent,
        color: TOKENS.ink,
        padding: pad,
      }}
    >
      <span
        style={{
          fontFamily: M,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 5,
        }}
      >
        {slide.eyebrow}
      </span>
      <span
        style={{
          fontFamily: F,
          fontSize: tall ? 108 : 84,
          fontWeight: 700,
          lineHeight: 1.04,
          marginTop: tall ? 90 : 60,
        }}
      >
        {slide.title}
      </span>
      {slide.body && (
        <span
          style={{
            fontFamily: M,
            fontSize: tall ? 44 : 36,
            fontWeight: 500,
            lineHeight: 1.45,
            marginTop: 36,
          }}
        >
          {slide.body}
        </span>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <span
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "28px 40px",
            borderRadius: 20,
            backgroundColor: TOKENS.ink,
            color: "#FFFFFF",
            fontFamily: M,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {slide.cta ?? (tall ? "Saiba mais — link na bio" : "Salve e compartilhe")}
        </span>
        <span style={{ fontFamily: M, fontSize: 26, fontWeight: 600, textAlign: "center" }}>
          {slide.handle}
        </span>
      </div>
    </div>
  );
}

// --- Template 4: Foto (mídia em cima, card escuro embaixo) -----------------------

function Foto(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const mediaH = tall ? Math.round(size.height * 0.55) : Math.round(size.height * 0.5);
  const cardStyle: CSSProperties = {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: TOKENS.ink,
    color: "#FFFFFF",
    padding: tall ? 72 : 56,
  };
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TOKENS.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          height: mediaH,
          backgroundImage: slide.image
            ? `url(${slide.image})`
            : `linear-gradient(135deg, ${slide.accent} 0%, ${TOKENS.ink} 130%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          alignItems: "flex-end",
          padding: 48,
        }}
      >
        <span
          style={{
            fontFamily: M,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 5,
            color: "rgba(255,255,255,0.92)",
            backgroundColor: "rgba(23,21,15,0.55)",
            padding: "12px 22px",
            borderRadius: 12,
          }}
        >
          {slide.eyebrow}
        </span>
      </div>
      <div style={cardStyle}>
        <span
          style={{
            fontFamily: F,
            fontSize: tall ? 76 : 62,
            fontWeight: 600,
            lineHeight: 1.08,
          }}
        >
          {slide.title}
        </span>
        {slide.body && (
          <span
            style={{
              fontFamily: M,
              fontSize: tall ? 38 : 32,
              lineHeight: 1.45,
              color: TOKENS.line,
              marginTop: 28,
            }}
          >
            {slide.body}
          </span>
        )}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: M,
            fontSize: 26,
            color: TOKENS.inkSoft,
          }}
        >
          <span>{slide.handle}</span>
          <span>
            {slide.n}/{slide.total}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Template 5: Letreiro (caixas com borda, texto repetido — ref. zine/street) ---

function Letreiro(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 88 : 64;
  const box: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `3px solid ${TOKENS.paper}`,
    color: TOKENS.paper,
    fontFamily: M,
    fontWeight: 800,
    letterSpacing: 6,
  };
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TOKENS.ink,
        padding: pad,
        gap: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 4,
          color: TOKENS.inkSoft,
          marginBottom: 32,
        }}
      >
        <span
          style={{ width: 18, height: 18, backgroundColor: slide.accent, marginTop: 4 }}
        />
        <span>
          {slide.n}/{slide.total}
        </span>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            ...box,
            fontSize: tall ? 64 : 52,
            padding: tall ? "30px 24px" : "22px 24px",
            marginTop: i === 0 ? 0 : -3,
            color: i === 1 ? slide.accent : TOKENS.paper,
          }}
        >
          {slide.eyebrow}
        </div>
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          marginBottom: "auto",
          paddingTop: tall ? 80 : 56,
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: `3px solid ${TOKENS.paper}`,
            padding: tall ? "40px 48px" : "32px 40px",
          }}
        >
          <span
            style={{
              fontFamily: F,
              fontSize: tall ? 96 : 76,
              fontWeight: 600,
              lineHeight: 1.06,
              color: TOKENS.paper,
            }}
          >
            {slide.title}
          </span>
        </div>
        {slide.body && (
          <span
            style={{
              fontFamily: M,
              fontSize: tall ? 40 : 32,
              lineHeight: 1.5,
              color: TOKENS.line,
              marginTop: 40,
            }}
          >
            {slide.body}
          </span>
        )}
      </div>
      <div
        style={{
          ...box,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 4,
          padding: "20px 32px",
          justifyContent: "space-between",
        }}
      >
        <span>«</span>
        <span>{slide.handle}</span>
        <span>»</span>
      </div>
    </div>
  );
}

export const TEMPLATES: TemplateDef[] = [
  { key: "manchete-escura", name: "Manchete escura", swatch: TOKENS.ink, render: MancheteEscura },
  { key: "papel", name: "Papel", swatch: TOKENS.paper, render: Papel },
  { key: "destaque", name: "Destaque", swatch: TOKENS.accent, render: Destaque },
  { key: "foto", name: "Foto", swatch: TOKENS.muted, render: Foto },
  { key: "letreiro", name: "Letreiro", swatch: TOKENS.line, render: Letreiro },
];

export const DEFAULT_TEMPLATE = "manchete-escura";

export function getTemplate(key: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}
