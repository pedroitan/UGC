"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { KeywordRow, PautaRow, SourceRow } from "@/types/db";
import {
  addKeywordAction,
  addSourceAction,
  dismissPautaAction,
  removeKeywordAction,
  toggleSourceAction,
} from "./actions";

const FORMATS = [
  { id: "carousel", label: "Carrossel" },
  { id: "feed", label: "Feed" },
  { id: "story", label: "Story" },
  { id: "reel", label: "Reel" },
] as const;

export function RadarClient({
  keywords,
  sources,
  pautas,
}: {
  keywords: KeywordRow[];
  sources: SourceRow[];
  pautas: PautaRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const includes = keywords.filter((k) => k.kind === "include");
  const excludes = keywords.filter((k) => k.kind === "exclude");

  async function pesquisar() {
    setSearching(true);
    try {
      const res = await fetch("/api/research", { method: "POST" });
      const data = (await res.json()) as { created?: number; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(
        data.created
          ? `${data.created} pauta(s) nova(s) no radar.`
          : "Nenhuma pauta nova desta vez.",
      );
      router.refresh();
    } catch {
      toast.error("Pesquisa falhou. Tente novamente.");
    } finally {
      setSearching(false);
    }
  }

  async function gerar(pautaId: string, format: string) {
    setGenerating(`${pautaId}:${format}`);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pautaId, format }),
      });
      const data = (await res.json()) as { postId?: string; error?: string };
      if (!res.ok || !data.postId) throw new Error(data.error);
      router.push(`/estudio?post=${data.postId}`);
    } catch {
      toast.error("Geração falhou. Tente novamente.");
      setGenerating(null);
    }
  }

  return (
    <div className="flex gap-7 px-11 py-9">
      <div className="flex min-w-0 grow flex-col gap-5">
        <header className="flex items-end justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-[40px] font-semibold tracking-tight">
              Radar de pautas
            </h1>
            <p className="text-sm text-muted-foreground">
              {pautas.length} pauta(s) ativas
            </p>
          </div>
          <Button onClick={pesquisar} disabled={searching} className="h-11 px-5">
            <Search className="h-4 w-4" />
            {searching ? "Pesquisando…" : "Pesquisar agora"}
          </Button>
        </header>

        {/* Palavras-chave */}
        <div className="flex flex-wrap items-center gap-2">
          {includes.map((k) => (
            <KeywordChip key={k.id} keyword={k} onRemove={() => startTransition(() => removeKeywordAction(k.id))} />
          ))}
          {excludes.map((k) => (
            <KeywordChip key={k.id} keyword={k} exclude onRemove={() => startTransition(() => removeKeywordAction(k.id))} />
          ))}
          <form
            action={async (fd) => {
              await addKeywordAction(fd);
              router.refresh();
            }}
            className="flex items-center gap-1.5"
          >
            <Input name="term" placeholder="+ palavra-chave" className="h-9 w-40 text-[13px]" />
            <select name="kind" defaultValue="include" className="h-9 rounded-lg border border-input bg-white px-2 text-[13px]">
              <option value="include">incluir</option>
              <option value="exclude">excluir</option>
            </select>
          </form>
        </div>

        {/* Lista de pautas */}
        <div className="flex flex-col gap-3">
          {pautas.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Nenhuma pauta ativa. Clique em &ldquo;Pesquisar agora&rdquo;.
              </CardContent>
            </Card>
          )}
          {pautas.map((p) => (
            <PautaCard
              key={p.id}
              pauta={p}
              generating={generating}
              onGenerate={gerar}
              onDismiss={() => startTransition(() => dismissPautaAction(p.id))}
            />
          ))}
        </div>
      </div>

      {/* Painel de fontes */}
      <aside aria-label="Fontes" className="flex w-[300px] shrink-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Fontes ativas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.name ?? s.url ?? s.type}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => toggleSourceAction(s.id, !s.active))}
                  className={s.active ? "font-semibold text-reel-fg" : "text-muted-foreground"}
                >
                  {s.active ? "ativa" : "pausada"}
                </button>
              </div>
            ))}
            <form
              action={async (fd) => {
                await addSourceAction(fd);
                router.refresh();
              }}
              className="mt-2 flex flex-col gap-2"
            >
              <Input name="name" placeholder="Nome da fonte" required className="h-9 text-[13px]" />
              <select
                name="type"
                defaultValue="rss"
                className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
              >
                <option value="rss">Feed RSS / site</option>
                <option value="google_news">Google Notícias (usa suas palavras-chave)</option>
              </select>
              <Input name="url" type="url" placeholder="https://…/feed.xml (obrigatório p/ RSS)" className="h-9 text-[13px]" />
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                <Plus className="h-4 w-4" /> Adicionar fonte ou RSS
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-ink bg-ink text-white">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Como o score funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-[#E4DED3]">
            Relevância para suas palavras-chave × frescor × autoridade da fonte ×
            potencial de engajamento. Pautas acima de 80 aparecem como quentes.
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function KeywordChip({
  keyword,
  exclude,
  onRemove,
}: {
  keyword: KeywordRow;
  exclude?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={
        exclude
          ? "inline-flex items-center gap-1 rounded-full border border-dashed border-accent-strong px-3 py-1.5 text-[13px] font-semibold text-accent-strong"
          : "inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white"
      }
    >
      {exclude ? `excluir: ${keyword.term}` : keyword.term}
      <button type="button" aria-label={`Remover ${keyword.term}`} onClick={onRemove} className="opacity-60 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState("…");
  useEffect(() => {
    const update = () => {
      const h = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
      setLabel(`há ${h} h`);
    };
    const start = setTimeout(update, 0);
    const tick = setInterval(update, 60_000);
    return () => {
      clearTimeout(start);
      clearInterval(tick);
    };
  }, [iso]);
  return <>{label}</>;
}

function PautaCard({
  pauta,
  generating,
  onGenerate,
  onDismiss,
}: {
  pauta: PautaRow;
  generating: string | null;
  onGenerate: (pautaId: string, format: string) => void;
  onDismiss: () => void;
}) {
  const score = pauta.score ?? 0;
  const hot = score >= 80;

  return (
    <article className="flex items-center gap-5 rounded-[14px] border border-line bg-surface px-5 py-4">
      <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <span
          className={`font-heading text-3xl font-bold ${hot ? "text-accent-strong" : "text-[#3D382F]"}`}
        >
          {score}
        </span>
        <div className="h-[5px] w-14 rounded-[3px] bg-[#EFEAE1]">
          <div
            className="h-[5px] rounded-[3px]"
            style={{ width: `${score}%`, background: hot ? "#9E3113" : "#3D382F" }}
          />
        </div>
      </div>
      <div className="flex min-w-0 grow flex-col gap-1">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          {hot && <Badge className="bg-carousel-bg text-carousel-fg">QUENTE</Badge>}
          <span>
            {pauta.citations[0]?.source_name ?? "web"} ·{" "}
            {pauta.published_at ? <TimeAgo iso={pauta.published_at} /> : "sem data"} ·{" "}
            {pauta.source_urls.length} fonte(s)
          </span>
        </div>
        <h2 className="text-[17px] font-bold leading-snug">{pauta.title}</h2>
        {pauta.summary && (
          <p className="text-sm leading-relaxed text-[#3D382F]">{pauta.summary}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex gap-1.5">
          {FORMATS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={f.id === "carousel" ? "default" : "outline"}
              disabled={generating !== null}
              onClick={() => onGenerate(pauta.id, f.id)}
            >
              {generating === `${pauta.id}:${f.id}` ? "Gerando…" : f.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Descartar pauta
        </button>
      </div>
    </article>
  );
}
