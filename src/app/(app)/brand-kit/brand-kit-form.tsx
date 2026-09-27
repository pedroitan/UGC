"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { m } from "@/lib/messages";
import type { BrandColor, BrandKitRow, VoiceTone } from "@/types/db";
import { saveBrandKit } from "./actions";

const TONES: VoiceTone[] = ["formal", "informativo", "descontraido", "provocativo"];

export function BrandKitForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: BrandKitRow | null;
}) {
  const [state, formAction, pending] = useActionState(saveBrandKit, null);
  const [logoLight, setLogoLight] = useState(initial?.logo_light_url ?? "");
  const [logoDark, setLogoDark] = useState(initial?.logo_dark_url ?? "");
  const [colors, setColors] = useState<BrandColor[]>(initial?.colors ?? []);
  const [tone, setTone] = useState<VoiceTone | null>(initial?.voice_tone ?? null);
  const [uploading, setUploading] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    if (state?.ok) toast.success(m.brandKit.saved);
    if (state?.error) toast.error(state.error);
  }, [state]);

  async function uploadLogo(kind: "light" | "dark", file: File) {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${workspaceId}/logo-${kind}.${ext}`;
    setUploading(kind);
    const { error } = await supabase.storage
      .from("brand-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(null);
    if (error) {
      toast.error(m.brandKit.saveError);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("brand-assets").getPublicUrl(path);
    if (kind === "light") setLogoLight(publicUrl);
    else setLogoDark(publicUrl);
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <input type="hidden" name="logo_light_url" value={logoLight} />
      <input type="hidden" name="logo_dark_url" value={logoDark} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="voice_tone" value={tone ?? ""} />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">{m.brandKit.logo}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <LogoSlot
              label={m.brandKit.logoLight}
              url={logoLight}
              dark={false}
              uploading={uploading === "light"}
              onFile={(f) => uploadLogo("light", f)}
            />
            <LogoSlot
              label={m.brandKit.logoDark}
              url={logoDark}
              dark
              uploading={uploading === "dark"}
              onFile={(f) => uploadLogo("dark", f)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl">{m.brandKit.palette}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={colors.length >= 6}
              onClick={() => setColors([...colors, { name: "", hex: "#17150F" }])}
            >
              <Plus className="h-4 w-4" /> {m.brandKit.addColor}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {colors.length === 0 && (
              <p className="text-sm text-muted-foreground">3 a 6 cores da marca.</p>
            )}
            {colors.map((color, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`color-${i}`} className="text-xs">
                    Cor
                  </Label>
                  <input
                    id={`color-${i}`}
                    type="color"
                    value={color.hex}
                    onChange={(e) =>
                      setColors(
                        colors.map((c, j) => (j === i ? { ...c, hex: e.target.value } : c)),
                      )
                    }
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  />
                </div>
                <div className="flex grow flex-col gap-1.5">
                  <Label htmlFor={`color-name-${i}`} className="text-xs">
                    {color.hex}
                  </Label>
                  <Input
                    id={`color-name-${i}`}
                    placeholder="Ex.: Tinta, Destaque…"
                    value={color.name}
                    onChange={(e) =>
                      setColors(
                        colors.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover cor"
                  onClick={() => setColors(colors.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">{m.brandKit.typography}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="font_title">{m.brandKit.fontTitle}</Label>
              <Input
                id="font_title"
                name="font_title"
                defaultValue={initial?.font_title ?? ""}
                placeholder="Ex.: Fraunces"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="font_body">{m.brandKit.fontBody}</Label>
              <Input
                id="font_body"
                name="font_body"
                defaultValue={initial?.font_body ?? ""}
                placeholder="Ex.: Manrope"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">{m.brandKit.voice}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div role="radiogroup" aria-label={m.brandKit.voice} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tone === t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "h-11 rounded-[10px] border text-sm font-semibold transition-colors",
                    tone === t
                      ? "border-ink bg-ink text-white"
                      : "border-line-strong bg-white text-ink",
                  )}
                >
                  {m.brandKit.tones[t]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voice_examples">{m.brandKit.examples}</Label>
              <Textarea
                id="voice_examples"
                name="voice_examples"
                rows={4}
                defaultValue={initial?.voice_examples.join("\n") ?? ""}
                placeholder={m.brandKit.examplesHint}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="never_use">{m.brandKit.neverUse}</Label>
              <Input
                id="never_use"
                name="never_use"
                defaultValue={initial?.never_use.join(", ") ?? ""}
                placeholder={m.brandKit.neverUseHint}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="handle">{m.brandKit.handle}</Label>
              <Input
                id="handle"
                name="handle"
                defaultValue={initial?.handle ?? ""}
                placeholder="@suamarca"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="h-11 px-6" disabled={pending || uploading !== null}>
            {m.brandKit.save}
          </Button>
        </div>
      </div>
    </form>
  );
}

function LogoSlot({
  label,
  url,
  dark,
  uploading,
  onFile,
}: {
  label: string;
  url: string;
  dark: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className={cn(
        "flex h-26 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-sm font-semibold transition-colors",
        dark
          ? "border-muted-ink bg-ink text-[#E4DED3]"
          : "border-[#B8B0A2] bg-paper text-[#3D382F]",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="max-h-16 max-w-[80%] object-contain" />
      ) : (
        <>
          <Upload className="h-5 w-5" aria-hidden />
          {uploading ? "Enviando…" : label}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
