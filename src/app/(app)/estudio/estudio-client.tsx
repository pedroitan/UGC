"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MediaAssetRow, PostRow } from "@/types/db";
import {
  adjustWithAIAction,
  approvePostAction,
  discardPostAction,
  moveSlideAction,
  renderAssetsAction,
  setTemplateAction,
  updateContentAction,
  updateSlideAction,
} from "./actions";

interface ScriptSlide {
  title?: string;
  body?: string;
  cta?: string;
}

interface TemplateOption {
  key: string;
  name: string;
  swatch: string;
}

const FORMAT_LABEL: Record<string, string> = {
  carousel: "Carrossel",
  feed: "Feed",
  story: "Story",
  reel: "Reel",
};

const FORMAT_SIZE: Record<string, string> = {
  carousel: "1080 × 1350 (4:5)",
  feed: "1080 × 1350 (4:5)",
  story: "1080 × 1920 (9:16)",
  reel: "1080 × 1920 (9:16)",
};

function slidesOf(post: PostRow | null): ScriptSlide[] {
  const s = (post?.script as { slides?: ScriptSlide[] } | undefined)?.slides;
  return Array.isArray(s) ? s : [];
}

function renderUrl(postId: string, index: number, version: string) {
  return `/api/render/${postId}/${index}.svg?v=${encodeURIComponent(version)}`;
}

export function EstudioClient({
  posts,
  selected,
  pauta,
  assets,
  templates,
  templateKey,
  handle,
}: {
  posts: PostRow[];
  selected: PostRow | null;
  pauta: { title: string; score: number | null } | null;
  assets: MediaAssetRow[];
  templates: TemplateOption[];
  templateKey: string | null;
  handle: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState(0);
  const [instruction, setInstruction] = useState("");

  const slides = slidesOf(selected);
  const index = Math.min(sel, Math.max(0, slides.length - 1));
  const slide = slides[index];
  const isStoryLike = selected?.format === "story" || selected?.format === "reel";
  const meta = (selected?.script as { _meta?: { similarity?: number; provider?: string } })
    ?._meta;
  const similarityPct = Math.round((meta?.similarity ?? 0) * 100);
  const version = selected?.updated_at ?? "0";

  function run(fn: () => Promise<unknown>, ok: string) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falhou");
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Fila de revisão */}
      <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-line px-4 py-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Estúdio</h1>
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Fila vazia. Gere um post a partir do Radar.
          </p>
        )}
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/estudio?post=${p.id}`}
            onClick={() => setSel(0)}
            className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              selected?.id === p.id
                ? "border-accent-brand bg-white"
                : "border-line bg-white hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{FORMAT_LABEL[p.format] ?? p.format}</Badge>
              <span
                className={`text-[11px] font-semibold ${
                  p.status === "approved"
                    ? "text-reel-fg"
                    : p.status === "draft"
                      ? "text-muted-foreground"
                      : "text-story-fg"
                }`}
              >
                {p.status === "approved"
                  ? "Aprovado"
                  : p.status === "draft"
                    ? "Rascunho"
                    : "Em revisão"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 font-medium">
              {slidesOf(p)[0]?.title ?? p.caption?.split("\n")[0] ?? "Post"}
            </p>
          </Link>
        ))}
      </aside>

      {!selected ? (
        <main className="flex grow items-center justify-center text-sm text-muted-foreground">
          Selecione um post na fila ao lado.
        </main>
      ) : (
        <main className="flex min-w-0 grow flex-col">
          {/* Header: breadcrumb + ações */}
          <header className="flex shrink-0 items-center gap-4 border-b border-line bg-white px-6 py-3.5">
            <div className="flex min-w-0 grow flex-col">
              <span className="text-[12px] text-muted-foreground">
                <Link href="/radar" className="hover:text-accent-strong">
                  Radar
                </Link>
                {pauta?.score != null && ` › Pauta score ${pauta.score}`}
              </span>
              <span className="truncate text-[15px] font-bold">
                {pauta?.title ?? slide?.title ?? "Post"}
              </span>
            </div>
            <Badge variant="secondary">{FORMAT_LABEL[selected.format]}</Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || selected.status === "draft"}
              onClick={() => run(() => discardPostAction(selected.id), "Post voltou para rascunho.")}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              disabled={pending || selected.status === "approved"}
              onClick={() =>
                run(() => approvePostAction(selected.id), "Post aprovado. Agende no Calendário (F3).")
              }
            >
              Aprovar
            </Button>
          </header>

          <div className="flex min-h-0 grow">
            {/* Trilha de slides */}
            <aside className="flex w-[132px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-line px-3.5 py-4">
              <span className="text-[12px] font-bold text-muted-foreground">
                {slides.length} slide{slides.length === 1 ? "" : "s"}
              </span>
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(i)}
                  className={`relative overflow-hidden rounded-lg border bg-ink text-left transition-shadow ${
                    i === index
                      ? "border-accent-brand ring-2 ring-accent-brand"
                      : "border-line hover:border-line-strong"
                  }`}
                  style={{ aspectRatio: isStoryLike ? "9/16" : "4/5" }}
                  aria-label={`Slide ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderUrl(selected.id, i, version)}
                    alt={s.title ?? `Slide ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </aside>

            {/* Preview no celular */}
            <section className="flex min-w-0 grow flex-col items-center justify-center gap-3 bg-[#EFEAE1] p-4">
              <PhonePreview
                post={selected}
                slides={slides}
                index={index}
                onSelect={setSel}
                version={version}
                story={isStoryLike}
                handle={handle}
              />
              <span className="text-[12px] text-muted-foreground">
                Pré-visualização em {FORMAT_SIZE[selected.format]} · Instagram
              </span>
            </section>

            {/* Painel de edição */}
            <aside className="flex w-[340px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-white px-5 py-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold">
                  Slide {index + 1} de {slides.length}
                </h2>
                <Badge className="bg-story-bg text-story-fg">
                  {selected.status === "approved" ? "Aprovado" : "Em revisão"}
                </Badge>
              </div>

              {slide && (
                <SlideEditor
                  key={`${selected.id}:${index}:${selected.updated_at}`}
                  total={slides.length}
                  slide={slide}
                  pending={pending}
                  onSave={(patch) =>
                    run(() => updateSlideAction(selected.id, index, patch), "Slide salvo.")
                  }
                  onMove={(dir) =>
                    run(() => moveSlideAction(selected.id, index, dir), "")
                  }
                />
              )}

              <div className="rounded-lg bg-muted px-3.5 py-3 text-[12px] leading-relaxed">
                <strong>Checagem de fatos:</strong> similaridade com as fontes:{" "}
                {similarityPct}% (limite 30%) · provedor: {meta?.provider ?? "—"}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-bold">Template</span>
                <div className="grid grid-cols-4 gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      title={t.name}
                      disabled={pending}
                      onClick={() =>
                        run(() => setTemplateAction(selected.id, t.key), `Template: ${t.name}`)
                      }
                      className={`h-14 rounded-lg border-2 ${
                        templateKey === t.key ? "border-accent-brand" : "border-line"
                      }`}
                      style={{ background: t.swatch }}
                      aria-label={`Template ${t.name}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ajuste" className="text-[13px] font-bold">
                  Pedir ajuste à IA
                </label>
                <div className="flex gap-2">
                  <input
                    id="ajuste"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ex.: deixe o gancho mais curto"
                    className="h-10 min-w-0 grow rounded-lg border border-line-strong px-3 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-10"
                    disabled={pending || instruction.trim().length < 3}
                    onClick={() =>
                      run(
                        () => adjustWithAIAction(selected.id, instruction),
                        "Script reescrito.",
                      )
                    }
                  >
                    Refazer
                  </Button>
                </div>
              </div>

              <CaptionEditor
                key={`cap-${selected.id}:${selected.updated_at}`}
                post={selected}
                pending={pending}
                onSave={(caption) =>
                  run(() => updateContentAction(selected.id, { caption }), "Legenda salva.")
                }
              />

              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted-foreground">
                <span>
                  Legenda · {selected.caption?.length ?? 0}/2.200 ·{" "}
                  {selected.hashtags.length} hashtags
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => renderAssetsAction(selected.id),
                      `${slides.length} PNG(s) renderizados.`,
                    )
                  }
                >
                  {assets.length ? `PNG (${assets.length})` : "Renderizar PNG"}
                </Button>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}

// --- Editor de slide ---------------------------------------------------------

function SlideEditor({
  total,
  slide,
  pending,
  onSave,
  onMove,
}: {
  total: number;
  slide: ScriptSlide;
  pending: boolean;
  onSave: (patch: { title: string; body: string; cta?: string }) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [title, setTitle] = useState(slide.title ?? "");
  const [body, setBody] = useState(slide.body ?? "");
  const [cta, setCta] = useState(slide.cta ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="slide-title" className="text-[13px] font-bold">
            Título
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              className="h-6 w-6 rounded border border-line text-xs disabled:opacity-40"
              disabled={pending}
              onClick={() => onMove(-1)}
              aria-label="Mover para trás"
            >
              ←
            </button>
            <button
              type="button"
              className="h-6 w-6 rounded border border-line text-xs disabled:opacity-40"
              disabled={pending || total < 2}
              onClick={() => onMove(1)}
              aria-label="Mover para frente"
            >
              →
            </button>
          </div>
        </div>
        <input
          id="slide-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          className="h-10 rounded-lg border border-line-strong px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slide-body" className="text-[13px] font-bold">
          Texto
        </label>
        <textarea
          id="slide-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={400}
          className="resize-none rounded-lg border border-line-strong px-3 py-2.5 text-sm leading-relaxed"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slide-cta" className="text-[13px] font-bold">
          CTA <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="slide-cta"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          maxLength={80}
          placeholder="Ex.: link na bio"
          className="h-10 rounded-lg border border-line-strong px-3 text-sm"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={pending || !title.trim()}
        onClick={() => onSave({ title: title.trim(), body: body.trim(), cta: cta.trim() || undefined })}
      >
        Salvar slide
      </Button>
    </div>
  );
}

// --- Editor de legenda --------------------------------------------------------

function CaptionEditor({
  post,
  pending,
  onSave,
}: {
  post: PostRow;
  pending: boolean;
  onSave: (caption: string) => void;
}) {
  const [caption, setCaption] = useState(post.caption ?? "");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="caption" className="text-[13px] font-bold">
        Legenda
      </label>
      <textarea
        id="caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        maxLength={2200}
        className="resize-none rounded-lg border border-line-strong px-3 py-2.5 text-[13px] leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {post.hashtags.join(" ")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || caption === post.caption}
          onClick={() => onSave(caption)}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

// --- Preview no mockup do celular --------------------------------------------

function PhonePreview({
  post,
  slides,
  index,
  onSelect,
  version,
  story,
  handle,
}: {
  post: PostRow;
  slides: ScriptSlide[];
  index: number;
  onSelect: (i: number) => void;
  version: string;
  story: boolean;
  handle: string;
}) {
  return (
    <div className="w-[300px] shrink-0 rounded-[42px] bg-[#0E0D0A] p-2.5 shadow-xl">
      <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[32px] bg-white">
        {story ? (
          <StoryScreen
            post={post}
            slides={slides}
            index={index}
            onSelect={onSelect}
            version={version}
            handle={handle}
          />
        ) : (
          <FeedScreen
            post={post}
            slides={slides}
            index={index}
            onSelect={onSelect}
            version={version}
            handle={handle}
          />
        )}
      </div>
    </div>
  );
}

function Avatar({ handle }: { handle: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-brand font-heading text-[13px] font-bold text-ink">
      {handle.replace("@", "").slice(0, 1).toUpperCase()}
    </span>
  );
}

function FeedScreen({
  post,
  slides,
  index,
  onSelect,
  version,
  handle,
}: {
  post: PostRow;
  slides: ScriptSlide[];
  index: number;
  onSelect: (i: number) => void;
  version: string;
  handle: string;
}) {
  const multi = slides.length > 1;
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-2.5 px-3">
        <Avatar handle={handle} />
        <span className="text-[12px] font-bold">{handle.replace("@", "")}</span>
        <span className="ml-auto text-base font-bold tracking-widest text-muted-foreground">
          ···
        </span>
      </div>
      <div className="relative h-[348px] shrink-0 bg-ink">
        {slides.length > 0 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={renderUrl(post.id, index, version)}
            alt={slides[index]?.title ?? "slide"}
            className="h-full w-full object-cover"
          />
        )}
        {multi && index > 0 && (
          <button
            type="button"
            onClick={() => onSelect(index - 1)}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm shadow"
            aria-label="Slide anterior"
          >
            ‹
          </button>
        )}
        {multi && index < slides.length - 1 && (
          <button
            type="button"
            onClick={() => onSelect(index + 1)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm shadow"
            aria-label="Próximo slide"
          >
            ›
          </button>
        )}
      </div>
      <div className="flex h-9 shrink-0 items-center gap-3 px-3 text-ink">
        <HeartIcon />
        <CommentIcon />
        <ShareIcon />
        <span className="ml-auto">
          <BookmarkIcon />
        </span>
      </div>
      {multi && (
        <div className="flex justify-center gap-1 pb-1">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-[#1F4A73]" : "bg-line-strong"}`}
            />
          ))}
        </div>
      )}
      <div className="flex min-h-0 grow flex-col gap-1 overflow-hidden px-3 pt-1 text-[11.5px] leading-snug">
        <span className="font-bold">1.234 curtidas</span>
        <span className="line-clamp-3">
          <b>{handle.replace("@", "")}</b>{" "}
          {post.caption?.split("\n").slice(0, 2).join(" ")}
        </span>
        <span className="truncate text-muted-foreground">{post.hashtags.join(" ")}</span>
      </div>
    </>
  );
}

function StoryScreen({
  post,
  slides,
  index,
  onSelect,
  version,
  handle,
}: {
  post: PostRow;
  slides: ScriptSlide[];
  index: number;
  onSelect: (i: number) => void;
  version: string;
  handle: string;
}) {
  return (
    <div className="relative flex min-h-0 grow flex-col bg-ink">
      {slides.length > 0 && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={renderUrl(post.id, index, version)}
          alt={slides[index]?.title ?? "tela"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Chrome do story */}
      <div className="relative flex flex-col gap-2 px-3 pt-3">
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] grow rounded-full ${
                i <= index ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Avatar handle={handle} />
          <span className="text-[12px] font-bold text-white drop-shadow">
            {handle.replace("@", "")}
          </span>
          <span className="text-[11px] text-white/80">agora</span>
          <span className="ml-auto text-lg font-bold text-white">×</span>
        </div>
      </div>
      {/* Zonas de toque: esquerda volta, direita avança */}
      <div className="relative flex min-h-0 grow">
        <button
          type="button"
          className="w-1/2"
          onClick={() => onSelect(Math.max(0, index - 1))}
          aria-label="Tela anterior"
        />
        <button
          type="button"
          className="w-1/2"
          onClick={() => onSelect(Math.min(slides.length - 1, index + 1))}
          aria-label="Próxima tela"
        />
      </div>
      {/* Responder */}
      <div className="relative flex items-center gap-2.5 px-3 pb-3.5">
        <span className="flex h-9 grow items-center rounded-full border border-white/70 px-3.5 text-[12px] text-white/90">
          Enviar mensagem
        </span>
        <span className="text-white">
          <HeartIcon light />
        </span>
        <span className="text-white">
          <ShareIcon light />
        </span>
      </div>
    </div>
  );
}

// --- Ícones (traço, sem lib de ícones) ----------------------------------------

function HeartIcon({ light = false }: { light?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? "#fff" : "currentColor"} strokeWidth="1.8">
      <path d="M12 20.5c-5.2-3.4-8.5-6.6-8.5-10.4C3.5 7 5.7 5 8.2 5c1.5 0 3 .8 3.8 2C12.8 5.8 14.3 5 15.8 5c2.5 0 4.7 2 4.7 5.1 0 3.8-3.3 7-8.5 10.4z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.8-.3-4-.9L3 21l1.5-4.9A8.5 8.5 0 1 1 21 12z" />
    </svg>
  );
}

function ShareIcon({ light = false }: { light?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? "#fff" : "currentColor"} strokeWidth="1.8">
      <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10l18-7z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-6-4.2L6 21V3z" />
    </svg>
  );
}
