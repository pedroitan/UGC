import "server-only";

import {
  MockChannelAdapter,
  MockLLMProvider,
  MockMediaProvider,
  MockSearchProvider,
} from "./mock";
import type { ChannelAdapter, LLMProvider, MediaProvider, SearchProvider } from "./types";

// Fábricas de provedores. As implementações reais entram nas fases seguintes;
// trocar de provedor é mudar a factory, nunca o pipeline.

export function getSearchProvider(): SearchProvider {
  // SEARCH_PROVIDER=tavily|exa|serper — implementar em F1.
  return new MockSearchProvider();
}

export function getLLMProvider(): LLMProvider {
  // ANTHROPIC_API_KEY — implementar em F1.
  return new MockLLMProvider();
}

export function getMediaProvider(): MediaProvider {
  // MEDIA_PROVIDER=kie|higgsfield — implementar em F2/F4.
  return new MockMediaProvider();
}

export function getChannelAdapter(_channel = "instagram"): ChannelAdapter {
  // Instagram real em F3; demais canais na Etapa 2.
  return new MockChannelAdapter();
}
