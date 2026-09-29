import "server-only";

import { serverEnv } from "@/lib/env";
import { AnthropicLLMProvider } from "./llm/anthropic";
import { KieMediaProvider } from "./media/kie";
import {
  MockChannelAdapter,
  MockLLMProvider,
  MockMediaProvider,
  MockSearchProvider,
} from "./mock";
import { ExaSearchProvider } from "./search/exa";
import { SerperSearchProvider } from "./search/serper";
import { TavilySearchProvider } from "./search/tavily";
import type { ChannelAdapter, LLMProvider, MediaProvider, SearchProvider } from "./types";

// Fábricas de provedores: trocar de provedor é mudar a factory, nunca o pipeline.
// Sem chave configurada, cai no mock — o pipeline inteiro roda em modo dev.

export function getSearchProvider(): SearchProvider {
  const env = serverEnv();
  switch (env.SEARCH_PROVIDER) {
    case "exa":
      return env.EXA_API_KEY ? new ExaSearchProvider(env.EXA_API_KEY) : new MockSearchProvider();
    case "serper":
      return env.SERPER_API_KEY ? new SerperSearchProvider(env.SERPER_API_KEY) : new MockSearchProvider();
    default:
      return env.TAVILY_API_KEY ? new TavilySearchProvider(env.TAVILY_API_KEY) : new MockSearchProvider();
  }
}

export function getLLMProvider(): LLMProvider {
  const env = serverEnv();
  return env.ANTHROPIC_API_KEY
    ? new AnthropicLLMProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL)
    : new MockLLMProvider();
}

export function getMediaProvider(): MediaProvider {
  const env = serverEnv();
  if (env.MEDIA_PROVIDER === "kie" && env.KIE_API_KEY) {
    return new KieMediaProvider(env.KIE_API_KEY, {
      imageModel: env.KIE_IMAGE_MODEL,
      videoModel: env.KIE_VIDEO_MODEL,
      audioModel: env.KIE_AUDIO_MODEL,
      hmacKey: env.KIE_WEBHOOK_HMAC_KEY,
    });
  }
  return new MockMediaProvider();
}

export function getChannelAdapter(_channel = "instagram"): ChannelAdapter {
  // Instagram real em F3; demais canais na Etapa 2.
  return new MockChannelAdapter();
}
