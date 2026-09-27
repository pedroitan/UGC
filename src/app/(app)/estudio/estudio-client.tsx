"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostRow } from "@/types/db";
import { approvePostAction, discardPostAction } from "./actions";

interface ScriptSlide {
  title?: string;
  body?: string;
}

const FORMAT_LABEL: Record<string, string> = {
  carousel: "Carrossel",
  feed: "Feed",
  story: "Story",
  reel: "Reel",
};

export function EstudioClient({
  posts,
  selected,
}: {
  posts: PostRow[];
  selected: PostRow | null;
}) {
  const [pending, startTransition] = useTransition();
  const slides = ((selected?.script?.slides ?? []) as ScriptSlide[]);
  const meta = (selected?.script?._meta ?? {}) as { similarity?: number; provider?: string };
  const similarityPct = Math.round((meta.similarity ?? 0) * 100);

  return (
    <div className="flex gap-7 px-11 py-9">
      <aside className="flex w-80 shrink-0 flex-col gap-4">
        <h1 className="font-heading text-[32px] font-semibold tracking-tight">Estúdio</h1>
        <div className="flex flex-col gap-2">
          {posts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Fila vazia. Gere um post a partir do Radar.
            </p>
          )}
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/estudio?post=${p.id}`}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                selected?.id === p.id
                  ? "border-accent-brand bg-white"
                  : "border-line bg-white hover:border-line-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{FORMAT_LABEL[p.format] ?? p.format}</Badge>
                <span
                  className={`text-xs font-semibold ${p.status === "approved" ? "text-reel-fg" : "text-story-fg"}`}
                >
                  {p.status === "approved" ? "Aprovado" : "Em revisão"}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 font-medium">
                {slides[0]?.title ?? p.caption?.split("\n")[0] ?? "Post"}
              </p>
            </Link>
          ))}
        </div>
      </aside>

      <section className="min-w-0 grow">
        {!selected ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Selecione um post na fila ao lado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="font-heading text-xl">
                  {FORMAT_LABEL[selected.format]} · {slides.length} slide(s)
                </CardTitle>
                <Badge className="bg-story-bg text-story-fg">Em revisão</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {slides.map((s, i) => (
                  <div key={i} className="rounded-xl bg-ink p-4 text-white">
                    <div className="flex items-baseline justify-between text-[11px] font-bold tracking-wider text-[#C9C2B4]">
                      <span>SLIDE {i + 1}</span>
                      <span className="font-heading text-lg font-bold text-accent-brand">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-1 font-heading text-lg font-semibold">{s.title}</p>
                    {s.body && (
                      <p className="mt-1 text-sm leading-relaxed text-[#E4DED3]">{s.body}</p>
                    )}
                  </div>
                ))}
                <div className="rounded-lg bg-muted px-4 py-3 text-[13px] leading-relaxed">
                  <strong>Checagem de fatos:</strong> similaridade com as fontes:{" "}
                  {similarityPct}% (limite 30%) · provedor: {meta.provider ?? "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">Legenda e ações</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed">{selected.caption}</p>
                <p className="text-muted-foreground">
                  {selected.hashtags.join(" ")}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Alt text: {selected.alt_text}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Legenda: {selected.caption?.length ?? 0}/2.200 ·{" "}
                  {selected.hashtags.length} hashtags
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    className="grow"
                    disabled={pending || selected.status === "approved"}
                    onClick={() =>
                      startTransition(async () => {
                        await approvePostAction(selected.id);
                        toast.success("Post aprovado. Agende no Calendário (F3).");
                      })
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await discardPostAction(selected.id);
                        toast("Post voltou para rascunho.");
                      })
                    }
                  >
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
