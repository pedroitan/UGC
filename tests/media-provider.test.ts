import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KieMediaProvider } from "@/lib/providers/media/kie";

const provider = new KieMediaProvider("test-key", { hmacKey: "hmac-secret" });

function mockCreateTaskResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("KieMediaProvider.createTask", () => {
  it("envia model default e converte 1080x1350 em 4:5", async () => {
    mockCreateTaskResponse({ code: 200, msg: "success", data: { taskId: "task_abc" } });
    const task = await provider.createTask({
      kind: "image",
      prompt: "fundo editorial",
      width: 1080,
      height: 1350,
      callbackUrl: "https://app.test/api/webhooks/media?secret=x",
    });

    expect(task).toEqual({ externalTaskId: "task_abc", provider: "kie" });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.kie.ai/api/v1/jobs/createTask");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("gpt-image-2-text-to-image");
    expect(sent.callBackUrl).toBe("https://app.test/api/webhooks/media?secret=x");
    expect(sent.input.aspect_ratio).toBe("4:5");
    expect(sent.input.prompt).toBe("fundo editorial");
  });

  it("usa 9:16 para story/reel", async () => {
    mockCreateTaskResponse({ code: 200, data: { taskId: "t2" } });
    await provider.createTask({ kind: "image", prompt: "p", width: 1080, height: 1920 });
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.input.aspect_ratio).toBe("9:16");
  });

  it("respeita override de modelo e env de imagem", async () => {
    const p = new KieMediaProvider("k", { imageModel: "nano-banana-2" });
    mockCreateTaskResponse({ code: 200, data: { taskId: "t3" } });
    await p.createTask({ kind: "image", prompt: "p", model: "seedream-4.0" });
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.model).toBe("seedream-4.0");
  });

  it("lança erro quando a API retorna falha", async () => {
    mockCreateTaskResponse({ code: 402, msg: "insufficient credits" });
    await expect(
      provider.createTask({ kind: "image", prompt: "p" }),
    ).rejects.toThrow(/402|insufficient/);
  });

  it("com imagem de referência troca pra image-to-image e manda input_urls", async () => {
    mockCreateTaskResponse({ code: 200, data: { taskId: "t_i2i" } });
    await provider.createTask({
      kind: "image",
      prompt: "restyle this",
      referenceImageUrls: ["https://ex.com/foto.jpg", "http://insegura.com/x.png"],
    });
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.model).toBe("gpt-image-2-image-to-image");
    expect(sent.input.input_urls).toEqual(["https://ex.com/foto.jpg"]); // só https
  });

  it("rejeita kinds sem modelo configurado", async () => {
    await expect(provider.createTask({ kind: "audio", prompt: "p" })).rejects.toThrow(
      /modelo/i,
    );
  });
});

describe("KieMediaProvider.parseWebhook", () => {
  const okPayload = {
    code: 200,
    msg: "success",
    data: {
      taskId: "task_ok",
      state: "success",
      resultJson: JSON.stringify({
        resultUrls: ["https://tempfile.aiquickdraw.com/a.png", "http://insecure.com/x.png"],
      }),
      creditsConsumed: 12,
    },
  };

  it("traduz sucesso com URLs https", () => {
    const r = provider.parseWebhook(okPayload);
    expect(r.status).toBe("done");
    expect(r.externalTaskId).toBe("task_ok");
    expect(r.mediaUrls).toEqual(["https://tempfile.aiquickdraw.com/a.png"]);
    expect(r.credits).toBe(12);
  });

  it("aceita task_id snake_case", () => {
    const r = provider.parseWebhook({
      data: { task_id: "task_snake", state: "success", resultJson: '{"resultUrls":["https://a.aiquickdraw.com/x.png"]}' },
    });
    expect(r.externalTaskId).toBe("task_snake");
    expect(r.status).toBe("done");
  });

  it("marca fail como failed com mensagem", () => {
    const r = provider.parseWebhook({
      data: { taskId: "t", state: "fail", failMsg: "content policy" },
    });
    expect(r.status).toBe("failed");
    expect(r.error).toBe("content policy");
  });

  it("estados intermediários viram pending", () => {
    for (const state of ["waiting", "queuing", "generating"]) {
      const r = provider.parseWebhook({ data: { taskId: "t", state } });
      expect(r.pending).toBe(true);
    }
  });

  it("sucesso sem URLs válidas é failed", () => {
    const r = provider.parseWebhook({
      data: { taskId: "t", state: "success", resultJson: '{"resultUrls":["http://x.com/a.png"]}' },
    });
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/mídia/);
  });

  it("payload malformado não quebra", () => {
    expect(provider.parseWebhook("lixo").status).toBe("failed");
    expect(provider.parseWebhook({ data: {} }).status).toBe("failed");
  });
});

describe("KieMediaProvider.getTaskResult (sync via recordInfo)", () => {
  it("traduz o recordInfo no mesmo resultado do webhook", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: "task_sync",
              state: "success",
              resultJson: '{"resultUrls":["https://cdn.aiquickdraw.com/art.png"]}',
              creditsConsumed: 8,
            },
          }),
          { status: 200 },
        )),
    );
    const r = await provider.getTaskResult("task_sync");
    expect(r.status).toBe("done");
    expect(r.mediaUrls).toEqual(["https://cdn.aiquickdraw.com/art.png"]);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(
      "recordInfo?taskId=task_sync",
    );
  });

  it("task ainda gerando volta pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ code: 200, data: { taskId: "t", state: "generating" } }),
          { status: 200 },
        )),
    );
    const r = await provider.getTaskResult("t");
    expect(r.pending).toBe(true);
  });
});

describe("KieMediaProvider.verifyWebhookSignature", () => {
  it("aceita assinatura válida e rejeita inválida", () => {
    const sig = createHmac("sha256", "hmac-secret").update("task_1.1700000000").digest("base64");
    expect(provider.verifyWebhookSignature("task_1", "1700000000", sig)).toBe(true);
    expect(provider.verifyWebhookSignature("task_1", "1700000000", "forjada")).toBe(false);
    expect(provider.verifyWebhookSignature("outra_task", "1700000000", sig)).toBe(false);
  });

  it("sem hmacKey configurada sempre rejeita", () => {
    const noKey = new KieMediaProvider("k");
    expect(noKey.verifyWebhookSignature("t", "1", "x")).toBe(false);
  });
});
