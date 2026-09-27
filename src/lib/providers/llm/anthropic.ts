import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMRequest, LLMResult } from "../types";

// Preços de referência (USD por milhão de tokens) — revisar se mudar o modelo.
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model = "claude-sonnet-4-5",
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResult> {
    const useTool = Boolean(request.jsonSchema);
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 2048,
      ...(request.system ? { system: request.system } : {}),
      messages: [{ role: "user", content: request.prompt }],
      ...(useTool
        ? {
            tools: [
              {
                name: "respond",
                description: "Responde com o objeto JSON pedido.",
                input_schema: {
                  type: "object" as const,
                  ...(request.jsonSchema ?? {}),
                },
              },
            ],
            tool_choice: { type: "tool" as const, name: "respond" },
          }
        : {}),
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    const textBlock = response.content.find((b) => b.type === "text");

    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
    const price = PRICE_PER_MTOK[this.model] ?? PRICE_PER_MTOK["claude-sonnet-4-5"];
    const costUsd =
      (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;

    return {
      text: textBlock?.type === "text" ? textBlock.text : "",
      json: toolBlock?.type === "tool_use" ? toolBlock.input : undefined,
      usage,
      costUsd,
    };
  }
}
