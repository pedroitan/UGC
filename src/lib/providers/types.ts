// Interfaces dos provedores — trocar provedor não pode exigir mudança no pipeline.
// Implementações reais entram nas fases F1+; cada interface já tem um mock.

export type Channel = "instagram" | "tiktok" | "youtube_shorts" | "kwai";
export type PostFormat = "carousel" | "feed" | "story" | "reel";

// --- SearchProvider (busca na web: Tavily, Exa, Serper) ---------------------

export interface SearchQuery {
  keywords: string[];
  excludeKeywords?: string[];
  language?: string;
  region?: string;
  since?: string; // ISO date
  maxResults?: number;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  sourceName?: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResultItem[]>;
}

// --- LLMProvider (redação/score: Claude) -------------------------------------

export interface LLMRequest {
  system?: string;
  prompt: string;
  /** JSON schema para resposta estruturada (opcional). */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface LLMResult {
  text: string;
  /** Preenchido quando jsonSchema é fornecido. */
  json?: unknown;
  usage?: { inputTokens: number; outputTokens: number };
  costUsd?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResult>;
}

// --- MediaProvider (geração de imagem/vídeo/TTS: kie.ai, Higgsfield) ---------

export type MediaKind = "image" | "video" | "audio";

export interface MediaTaskRequest {
  kind: MediaKind;
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  /** URLs de imagem de referência (image-to-image). */
  referenceImageUrls?: string[];
  /** URL de retorno para o webhook do provedor. */
  callbackUrl?: string;
}

export interface MediaTask {
  externalTaskId: string;
  provider: string;
}

export interface MediaWebhookResult {
  externalTaskId: string;
  status: "done" | "failed";
  /** URLs temporárias do provedor — copiar para o Storage imediatamente. */
  mediaUrls: string[];
  error?: string;
}

export interface MediaProvider {
  readonly name: string;
  /** Geração assíncrona: cria a tarefa e retorna o id. Resultado chega por webhook. */
  createTask(request: MediaTaskRequest): Promise<MediaTask>;
  /** Valida e traduz o payload do webhook em um resultado canônico. */
  parseWebhook(payload: unknown): MediaWebhookResult;
}

// --- ChannelAdapter (publicação: Instagram primeiro) -------------------------

export interface MediaAssetRef {
  url: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface PublishablePost {
  id: string;
  format: PostFormat;
  caption?: string;
  media: MediaAssetRef[];
}

export interface ConnectedAccount {
  externalId: string;
  handle: string;
  /** Token já descriptografado — nunca logar. */
  accessToken: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PublishResult {
  ok: boolean;
  externalMediaId?: string;
  error?: string;
  /** true quando a API não suporta o formato e vira publicação assistida. */
  assisted?: boolean;
}

export interface ChannelLimits {
  dailyLimit: number;
  usedToday: number;
}

export interface PostInsights {
  reach?: number;
  likes?: number;
  saves?: number;
  shares?: number;
  comments?: number;
}

export interface ChannelAdapter {
  readonly channel: Channel;
  validate(post: PublishablePost): ValidationResult;
  publish(post: PublishablePost, account: ConnectedAccount): Promise<PublishResult>;
  getLimits(account: ConnectedAccount): Promise<ChannelLimits>;
  getInsights(externalMediaId: string, account: ConnectedAccount): Promise<PostInsights>;
}
