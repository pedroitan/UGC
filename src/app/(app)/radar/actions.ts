"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addKeyword,
  addSource,
  deleteKeyword,
  getOrCreateWorkspace,
  toggleSource,
  updatePautaStatus,
} from "@/lib/db";

export async function addKeywordAction(formData: FormData) {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) return;
  const parsed = z
    .object({
      term: z.string().trim().min(1).max(60),
      kind: z.enum(["include", "exclude"]).default("include"),
    })
    .safeParse({ term: formData.get("term"), kind: formData.get("kind") ?? "include" });
  if (!parsed.success) return;
  await addKeyword(workspace.id, parsed.data.term, parsed.data.kind);
  revalidatePath("/radar");
}

export async function removeKeywordAction(id: string) {
  await deleteKeyword(id);
  revalidatePath("/radar");
}

export async function addSourceAction(formData: FormData) {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) return;
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      url: z.string().trim().url().or(z.literal("")),
      type: z.enum(["rss", "site", "google_news"]).default("rss"),
    })
    .safeParse({
      name: formData.get("name"),
      url: formData.get("url"),
      type: formData.get("type") ?? "rss",
    });
  if (!parsed.success) return;
  if (parsed.data.type !== "google_news" && !parsed.data.url) return;
  await addSource(workspace.id, {
    type: parsed.data.type,
    url: parsed.data.url || null,
    name: parsed.data.name,
  });
  revalidatePath("/radar");
}

export async function toggleSourceAction(id: string, active: boolean) {
  await toggleSource(id, active);
  revalidatePath("/radar");
}

export async function dismissPautaAction(id: string) {
  await updatePautaStatus(id, "dismissed");
  revalidatePath("/radar");
}
