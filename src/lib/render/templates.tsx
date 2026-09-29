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
        ...(slide.image
          ? {
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
        color: "#FFFFFF",
      }}
    >
      {slide.image && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(23,21,15,0.82)",
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: pad }}>
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
      {slide.image && (
        <div
          style={{
            display: "flex",
            height: Math.round(size.height * 0.38),
            marginTop: tall ? 56 : 40,
            border: `3px solid ${TOKENS.ink}`,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <span
        style={{
          fontFamily: F,
          fontSize: tall ? 96 : 78,
          fontWeight: 700,
          lineHeight: 1.06,
          marginTop: slide.image ? 48 : tall ? 80 : 56,
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
        ...(slide.image
          ? {
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
        color: TOKENS.ink,
      }}
    >
      {slide.image && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `${slide.accent}E0`,
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: pad }}>
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
      {slide.image && (
        <div
          style={{
            display: "flex",
            height: Math.round(size.height * 0.3),
            marginTop: tall ? 56 : 40,
            border: `3px solid ${TOKENS.paper}`,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
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

// --- Template 6: Moderno (bloco accent + ink, texto vertical, pontos) -----------

function VerticalText({ text, color, size }: { text: string; color: string; size: number }) {
  const chars = text.replace(/[^A-ZÀ-Ú0-9 ]/gi, "").toUpperCase().slice(0, 14).split("");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: M,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: 2,
        color,
        lineHeight: 1.15,
      }}
    >
      {chars.map((c, i) => (
        <span key={i}>{c === " " ? " " : c}</span>
      ))}
    </div>
  );
}

function Dots({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2].map((row) => (
        <div key={row} style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Moderno(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 80 : 60;
  const stripW = tall ? 110 : 90;
  const innerW = size.width - stripW;
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        backgroundColor: slide.accent,
        color: TOKENS.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: stripW,
          borderRight: `3px solid ${TOKENS.ink}`,
        }}
      >
        <VerticalText text={slide.eyebrow || "PAUTA"} color={TOKENS.ink} size={tall ? 34 : 28} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: innerW,
          padding: pad,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: M,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4,
          }}
        >
          <span style={{ border: `2px solid ${TOKENS.ink}`, padding: "8px 14px" }}>
            {String(slide.n).padStart(2, "0")}
          </span>
          <span>
            {slide.n}/{slide.total}
          </span>
        </div>
        <span
          style={{
            fontFamily: M,
            fontSize: tall ? 92 : 74,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -1,
            textTransform: "uppercase",
            marginTop: tall ? 72 : 48,
          }}
        >
          {slide.title}
        </span>
        {slide.body && (
          <span
            style={{
              display: "flex",
              fontFamily: M,
              fontSize: tall ? 36 : 30,
              fontWeight: 500,
              lineHeight: 1.45,
              marginTop: 36,
              backgroundColor: TOKENS.paper,
              padding: "24px 28px",
            }}
          >
            {slide.body}
          </span>
        )}
        {slide.image && (
          <div
            style={{
              display: "flex",
              height: tall ? 420 : 320,
              marginTop: 40,
              border: `4px solid ${TOKENS.ink}`,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: TOKENS.ink,
            color: TOKENS.paper,
            padding: "22px 28px",
            fontFamily: M,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          <span>{slide.handle}</span>
          <Dots color={slide.accent} />
        </div>
      </div>
    </div>
  );
}

// --- Template 7: Expo (cartaz de exposição: papel, fileiras finas, foto) -------

function Expo(slide: SlideInput, size: { width: number; height: number }): ReactNode {
  const tall = size.height > size.width;
  const pad = tall ? 88 : 64;
  const rule = (mt = 0) => (
    <div
      key={mt}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: mt,
      }}
    >
      <div style={{ height: 2, backgroundColor: TOKENS.ink }} />
      <div style={{ height: 2, backgroundColor: TOKENS.ink }} />
    </div>
  );
  const photoH = slide.image ? Math.round(size.height * 0.34) : 0;
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
      {rule()}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 5,
          textTransform: "uppercase",
          padding: "14px 0",
        }}
      >
        <span>Pauta · Nº {String(slide.n).padStart(2, "0")}</span>
        <span>
          {slide.n}/{slide.total}
        </span>
      </div>
      {rule()}
      <span
        style={{
          fontFamily: M,
          fontSize: slide.image ? (tall ? 84 : 68) : tall ? 110 : 88,
          fontWeight: 800,
          lineHeight: 0.98,
          letterSpacing: -2,
          textTransform: "uppercase",
          marginTop: slide.image ? (tall ? 44 : 32) : tall ? 56 : 40,
        }}
      >
        {slide.title}
      </span>
      {slide.image && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: photoH,
            marginTop: tall ? 40 : 32,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: tall ? 48 : 32,
            }}
          >
            <span
              style={{
                fontFamily: F,
                fontStyle: "italic",
                fontSize: tall ? 84 : 64,
                fontWeight: 500,
                color: slide.accent,
                lineHeight: 1,
              }}
            >
              {slide.eyebrow}
            </span>
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `2px solid ${TOKENS.ink}`,
              backgroundColor: TOKENS.paper,
              padding: "16px 20px",
              fontFamily: M,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            <span>«</span>
            <span>{slide.handle}</span>
            <span>»</span>
          </div>
        </div>
      )}
      {slide.body && (
        <span
          style={{
            fontFamily: M,
            fontSize: tall ? 32 : 27,
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: 1,
            color: TOKENS.muted,
            marginTop: slide.image ? (tall ? 32 : 24) : tall ? 44 : 32,
          }}
        >
          {slide.body}
        </span>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>{rule()}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: M,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 5,
          textTransform: "uppercase",
          padding: "14px 0 0",
        }}
      >
        <span>{slide.eyebrow}</span>
        <span>{slide.handle}</span>
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
  { key: "moderno", name: "Moderno", swatch: "#F5E000", render: Moderno },
  { key: "expo", name: "Expo", swatch: "#4ADE57", render: Expo },
];

export const DEFAULT_TEMPLATE = "manchete-escura";

export function getTemplate(key: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}
