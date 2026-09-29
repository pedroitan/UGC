import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  MediaKind,
  MediaProvider,
  MediaTask,
  MediaTaskRequest,
  MediaWebhookResult,
} from "../types";

// Kie.ai — API assíncrona de jobs (docs.kie.ai). O texto dos slides nunca é
// gerado pela IA de imagem: ela produz só fundo/ilustração (ver AGENTS.md).
const API_BASE = "https://api.kie.ai";

// Modelo default por tipo de mídia — configurável por env para trocar de
// modelo sem deploy (ex.: nano-banana-2, seedream, kling).
const DEFAULT_MODELS: Record<MediaKind, string | null> = {
  image: "gpt-image-2-text-to-image",
  video: null,
  audio: null,
};

// Razões de aspecto aceitas pelo createTask do kie.ai (market).
const ASPECT_RATIOS = [
  "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9",
  "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21",
] as const;

function closestAspectRatio(width: number, height: number): string {
  const target = width / height;
  let best: string = "auto";
  let bestDiff = Infinity;
  for (const r of ASPECT_RATIOS) {
    const [w, h] = r.split(":").map(Number);
    const diff = Math.abs(Math.log(w / h / target));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best;
}

const createTaskResponseSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z.object({ taskId: z.string() }).optional(),
});

// Callback do kie.ai: {code, msg, data: {taskId|task_id, state, resultJson,
// failCode, failMsg, creditsConsumed, ...}}. resultJson é uma string JSON.
const webhookSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: z.object({
    taskId: z.string().optional(),
    task_id: z.string().optional(),
    state: z.string().optional(),
    resultJson: z.string().optional(),
    failCode: z.string().optional(),
    failMsg: z.string().optional(),
    creditsConsumed: z.number().optional(),
  }).passthrough().optional(),
});

export interface KieWebhookParsed extends MediaWebhookResult {
  /** Estado intermediário (waiting/queuing/generating) — não atualiza o run. */
  pending?: boolean;
  credits?: number;
}

export class KieMediaProvider implements MediaProvider {
  readonly name = "kie";

  constructor(
    private apiKey: string,
    private opts: { imageModel?: string; videoModel?: string; audioModel?: string; hmacKey?: string } = {},
  ) {}

  private modelFor(kind: MediaKind, override?: string): string {
    if (override) return override;
    const configured =
      kind === "image" ? this.opts.imageModel
      : kind === "video" ? this.opts.videoModel
      : this.opts.audioModel;
    const model = configured ?? DEFAULT_MODELS[kind];
    if (!model) {
      throw new Error(`kie.ai: nenhum modelo configurado para "${kind}"`);
    }
    return model;
  }

  async createTask(request: MediaTaskRequest): Promise<MediaTask> {
    const model = this.modelFor(request.kind, request.model);
    const input: Record<string, unknown> = { prompt: request.prompt };
    if (request.width && request.height) {
      input.aspect_ratio = closestAspectRatio(request.width, request.height);
    }
    if (request.durationSeconds) input.duration = request.durationSeconds;

    const res = await fetch(`${API_BASE}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...(request.callbackUrl ? { callBackUrl: request.callbackUrl } : {}),
        input,
      }),
    });

    const body = createTaskResponseSchema.safeParse(await res.json().catch(() => null));
    if (!res.ok || !body.success || body.data.code !== 200 || !body.data.data?.taskId) {
      const msg = body.success ? (body.data.msg ?? `HTTP ${res.status}`) : `HTTP ${res.status}`;
      throw new Error(`kie.ai createTask falhou: ${msg}`);
    }
    return { externalTaskId: body.data.data.taskId, provider: this.name };
  }

  parseWebhook(payload: unknown): KieWebhookParsed {
    const parsed = webhookSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.data) {
      return { externalTaskId: "", status: "failed", mediaUrls: [], error: "payload inválido" };
    }
    const d = parsed.data.data;
    const taskId = d.taskId ?? d.task_id ?? "";
    if (!taskId) {
      return { externalTaskId: "", status: "failed", mediaUrls: [], error: "sem taskId" };
    }
    const base = { externalTaskId: taskId, credits: d.creditsConsumed };

    if (d.state !== "success" && d.state !== "fail") {
      return { ...base, status: "done", mediaUrls: [], pending: true };
    }
    if (d.state === "fail") {
      return {
        ...base,
        status: "failed",
        mediaUrls: [],
        error: d.failMsg || d.failCode || "geração falhou",
      };
    }
    let mediaUrls: string[] = [];
    try {
      const result = JSON.parse(d.resultJson ?? "{}") as { resultUrls?: unknown };
      if (Array.isArray(result.resultUrls)) {
        mediaUrls = result.resultUrls.filter(
          (u): u is string => typeof u === "string" && u.startsWith("https://"),
        );
      }
    } catch {
      /* resultJson malformado */
    }
    return mediaUrls.length > 0
      ? { ...base, status: "done", mediaUrls }
      : { ...base, status: "failed", mediaUrls, error: "sem mídia no resultado" };
  }

  /**
   * Verifica a assinatura HMAC do webhook (docs.kie.ai/common-api/webhook-verification):
   * base64(HMAC-SHA256(`${taskId}.${timestamp}`, hmacKey)).
   */
  verifyWebhookSignature(taskId: string, timestamp: string, signature: string): boolean {
    if (!this.opts.hmacKey) return false;
    const expected = createHmac("sha256", this.opts.hmacKey)
      .update(`${taskId}.${timestamp}`)
      .digest("base64");
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
