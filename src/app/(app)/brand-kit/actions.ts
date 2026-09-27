"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateWorkspace, upsertBrandKit } from "@/lib/db";
import { m } from "@/lib/messages";

const colorSchema = z.object({
  name: z.string().max(40),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const brandKitSchema = z.object({
  logo_light_url: z.url().or(z.literal("")).nullable(),
  logo_dark_url: z.url().or(z.literal("")).nullable(),
  colors: z.array(colorSchema).max(6),
  font_title: z.string().max(80).nullable(),
  font_body: z.string().max(80).nullable(),
  voice_tone: z.enum(["formal", "informativo", "descontraido", "provocativo"]).nullable(),
  voice_examples: z.array(z.string().max(2200)).max(10),
  never_use: z.array(z.string().max(80)).max(20),
  handle: z
    .string()
    .regex(/^@?[A-Za-z0-9._]{1,30}$/)
    .nullable(),
});

export type BrandKitFormState = { error?: string; ok?: boolean } | null;

export async function saveBrandKit(
  _prev: BrandKitFormState,
  formData: FormData,
): Promise<BrandKitFormState> {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) return { error: m.auth.genericError };

  const raw = {
    logo_light_url: formData.get("logo_light_url") || null,
    logo_dark_url: formData.get("logo_dark_url") || null,
    colors: JSON.parse(String(formData.get("colors") ?? "[]")),
    font_title: formData.get("font_title") || null,
    font_body: formData.get("font_body") || null,
    voice_tone: formData.get("voice_tone") || null,
    voice_examples: String(formData.get("voice_examples") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    never_use: String(formData.get("never_use") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    handle: formData.get("handle") || null,
  };

  const parsed = brandKitSchema.safeParse(raw);
  if (!parsed.success) return { error: m.brandKit.saveError };

  const normalized = {
    ...parsed.data,
    logo_light_url: parsed.data.logo_light_url || null,
    logo_dark_url: parsed.data.logo_dark_url || null,
    handle: parsed.data.handle
      ? parsed.data.handle.startsWith("@")
        ? parsed.data.handle
        : `@${parsed.data.handle}`
      : null,
  };

  try {
    await upsertBrandKit(workspace.id, normalized);
  } catch {
    return { error: m.brandKit.saveError };
  }

  revalidatePath("/brand-kit");
  return { ok: true };
}
