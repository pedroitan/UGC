import type {
  ChannelAdapter,
  ChannelLimits,
  ConnectedAccount,
  LLMProvider,
  LLMRequest,
  LLMResult,
  MediaProvider,
  MediaTask,
  MediaTaskRequest,
  MediaWebhookResult,
  PostInsights,
  PublishablePost,
  PublishResult,
  SearchProvider,
  SearchQuery,
  SearchResultItem,
  ValidationResult,
} from "./types";

// Implementações mock de cada provedor — usadas até as integrações reais (F1+).

export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";

  async search(_query: SearchQuery): Promise<SearchResultItem[]> {
    return [];
  }
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async complete(_request: LLMRequest): Promise<LLMResult> {
    return { text: "", usage: { inputTokens: 0, outputTokens: 0 }, costUsd: 0 };
  }
}

export class MockMediaProvider implements MediaProvider {
  readonly name = "mock";

  async createTask(_request: MediaTaskRequest): Promise<MediaTask> {
    return { externalTaskId: `mock_${crypto.randomUUID()}`, provider: this.name };
  }

  parseWebhook(_payload: unknown): MediaWebhookResult {
    return { externalTaskId: "", status: "failed", mediaUrls: [], error: "mock" };
  }
}

export class MockChannelAdapter implements ChannelAdapter {
  readonly channel = "instagram" as const;

  validate(post: PublishablePost): ValidationResult {
    const errors: string[] = [];
    if (post.format === "carousel" && (post.media.length < 2 || post.media.length > 10)) {
      errors.push("Carrossel precisa de 2 a 10 itens.");
    }
    if (post.caption && post.caption.length > 2200) {
      errors.push("Legenda acima de 2.200 caracteres.");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(_post: PublishablePost, _account: ConnectedAccount): Promise<PublishResult> {
    return { ok: false, error: "Adapter mock — publicação não implementada (F3)." };
  }

  async getLimits(_account: ConnectedAccount): Promise<ChannelLimits> {
    return { dailyLimit: 25, usedToday: 0 };
  }

  async getInsights(_externalMediaId: string, _account: ConnectedAccount): Promise<PostInsights> {
    return {};
  }
}
