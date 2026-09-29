import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicLLMProvider } from "@/lib/providers/llm/anthropic";

afterEach(() => vi.unstubAllGlobals());

// LLM_PROVIDER=kie fala Claude via endpoint compatível do kie.ai
// (https://api.kie.ai/claude/v1/messages, auth x-api-key = KIE_API_KEY).
describe("LLM via kie.ai", () => {
  it("envia POST pro endpoint do kie.ai com a KIE_API_KEY", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "msg_1",
            role: "assistant",
            content: [{ type: "text", text: "ok" }],
            usage: { input_tokens: 10, output_tokens: 2 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )),
    );

    const provider = new AnthropicLLMProvider("kie-key", "claude-haiku-4-5", {
      baseURL: "https://api.kie.ai/claude",
      name: "kie",
    });
    const r = await provider.complete({ prompt: "oi" });

    expect(provider.name).toBe("kie");
    expect(r.text).toBe("ok");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("api.kie.ai/claude/v1/messages");
    expect(init.headers.get("x-api-key")).toBe("kie-key");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("claude-haiku-4-5");
  });

  it("sem baseURL continua na API da Anthropic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "msg_1",
            role: "assistant",
            content: [{ type: "text", text: "ok" }],
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )),
    );

    const provider = new AnthropicLLMProvider("ant-key");
    await provider.complete({ prompt: "oi" });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("api.anthropic.com");
    expect(provider.name).toBe("anthropic");
  });
});
