"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getOrCreateWorkspace,
  getPost,
  updatePostContent,
  updatePostScript,
  updatePostStatus,
} from "@/lib/db";
import { adjustPostScript } from "@/lib/pipeline/generate";
import { requestPostArt, syncPostMedia } from "@/lib/pipeline/media";
import { renderPostAssets } from "@/lib/pipeline/render";
import { TEMPLATES } from "@/lib/render";
import { getSlides } from "@/lib/render";
import type { PostRow } from "@/types/db";

async function requireOwnedPost(id: string): Promise<PostRow> {
  const [workspace, post] = await Promise.all([getOrCreateWorkspace(), getPost(id)]);
  if (!workspace || !post || post.workspace_id !== workspace.id) {
    throw new Error("Post não encontrado");
  }
  return post;
}

export async function approvePostAction(id: string) {
  await requireOwnedPost(id);
  await updatePostStatus(id, "approved");
  revalidatePath("/estudio");
}

export async function discardPostAction(id: string) {
  await requireOwnedPost(id);
  await updatePostStatus(id, "draft");
  revalidatePath("/estudio");
}

const slidePatchSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(400),
  cta: z.string().max(80).optional(),
});

export async function updateSlideAction(
  postId: string,
  index: number,
  patch: { title?: string; body?: string; cta?: string },
) {
  const post = await requireOwnedPost(postId);
  const parsed = slidePatchSchema.partial().safeParse(patch);
  if (!parsed.success) throw new Error("Slide inválido");

  const slides = getSlides(post).map((s) => ({ ...s }));
  const i = Math.floor(index);
  if (i < 0 || i >= slides.length) throw new Error("Slide fora do intervalo");
  slides[i] = { ...slides[i], ...parsed.data };

  await updatePostScript(postId, { ...post.script, slides });
  revalidatePath("/estudio");
}

export async function moveSlideAction(postId: string, index: number, dir: -1 | 1) {
  const post = await requireOwnedPost(postId);
  const slides = getSlides(post).map((s) => ({ ...s }));
  const i = Math.floor(index);
  const j = i + dir;
  if (i < 0 || i >= slides.length || j < 0 || j >= slides.length) return;
  [slides[i], slides[j]] = [slides[j], slides[i]];
  await updatePostScript(postId, { ...post.script, slides });
  revalidatePath("/estudio");
}

export async function setTemplateAction(postId: string, templateKey: string) {
  const post = await requireOwnedPost(postId);
  if (!TEMPLATES.some((t) => t.key === templateKey)) throw new Error("Template inválido");
  const script = post.script as Record<string, unknown>;
  const meta = (script._meta ?? {}) as Record<string, unknown>;
  await updatePostScript(postId, { ...script, _meta: { ...meta, template: templateKey } });
  revalidatePath("/estudio");
}

export async function toggleSourceImageAction(postId: string, use: boolean) {
  const post = await requireOwnedPost(postId);
  const script = post.script as Record<string, unknown>;
  const meta = (script._meta ?? {}) as Record<string, unknown>;
  if (!meta.image) return;
  await updatePostScript(postId, { ...script, _meta: { ...meta, useImage: use } });
  revalidatePath("/estudio");
}

const contentSchema = z.object({
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string().max(50)).max(30).optional(),
  alt_text: z.string().max(1000).optional(),
});

export async function updateContentAction(
  postId: string,
  patch: { caption?: string; hashtags?: string[]; alt_text?: string },
) {
  const post = await requireOwnedPost(postId);
  const parsed = contentSchema.safeParse(patch);
  if (!parsed.success) throw new Error("Conteúdo inválido");
  await updatePostContent(post.id, parsed.data);
  revalidatePath("/estudio");
}

const instructionSchema = z.string().trim().min(3).max(500);

export async function adjustWithAIAction(postId: string, instruction: string) {
  const post = await requireOwnedPost(postId);
  const parsed = instructionSchema.safeParse(instruction);
  if (!parsed.success) throw new Error("Instrução inválida");
  await adjustPostScript(post.id, parsed.data);
  revalidatePath("/estudio");
}

export async function generateArtAction(postId: string) {
  const post = await requireOwnedPost(postId);
  await requestPostArt(post.id);
  revalidatePath("/estudio");
}

/** Recupera arte já gerada no provedor cujo webhook não chegou. */
export async function syncMediaAction(postId: string) {
  const post = await requireOwnedPost(postId);
  const r = await syncPostMedia(post.id);
  revalidatePath("/estudio");
  return r;
}

export async function renderAssetsAction(postId: string) {
  const post = await requireOwnedPost(postId);
  await renderPostAssets(post.id);
  revalidatePath("/estudio");
}
