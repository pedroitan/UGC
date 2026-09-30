// Exemplo Higgsfield: gera um vídeo 5s 720p 16:9 com Seedance 2.5 e imprime a URL.
// Rode: pnpm tsx index.ts   (a credencial vem de HF_CREDENTIALS em .env.local)
import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";

loadEnv({ path: ".env.local" });

async function main() {
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials) {
    console.error("HF_CREDENTIALS não definida. Preencha em .env.local (formato key-id:key-secret).");
    process.exit(1);
  }
  config({ credentials });

  const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
      output_format: "mp4",
      generate_audio: true,
    },
    withPolling: true,
  });

  // Status terminais possíveis: completed | failed | nsfw (moderado/cancelado)
  if (result.status !== "completed" || !result.video?.url) {
    console.error(`Geração não completou — status: ${result.status}`, result);
    process.exit(2);
  }

  console.log("Video URL:", result.video.url);
}

main().catch((e) => {
  console.error("Falha na requisição:", e instanceof Error ? e.message : e);
  process.exit(1);
});
