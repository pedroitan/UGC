import "server-only";
import { z } from "zod";

// Vars criadas vazias (ex.: import do .env.example na Vercel) contam como
// "não definidas" — não devem derrubar a validação.
const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
const optStr = z.preprocess(blank, z.string().min(1).optional());
const optUrl = z.preprocess(blank, z.url().optional());
const optEnum = <T extends [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess(blank, z.enum(values).default(fallback));

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(blank, z.url().default("http://localhost:3000")),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(blank, z.url().or(z.literal("")).default("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(blank, z.string().default("")),
  SUPABASE_SERVICE_ROLE_KEY: optStr,
  TOKEN_ENCRYPTION_KEY: optStr,
  CRON_SECRET: optStr,
  META_APP_ID: optStr,
  META_APP_SECRET: optStr,
  META_REDIRECT_URI: optUrl,
  LLM_PROVIDER: optEnum(["anthropic", "kie"], "anthropic"),
  ANTHROPIC_API_KEY: optStr,
  ANTHROPIC_MODEL: z.preprocess(blank, z.string().min(1).default("claude-sonnet-4-5")),
  SEARCH_PROVIDER: optEnum(["tavily", "exa", "serper"], "tavily"),
  TAVILY_API_KEY: optStr,
  EXA_API_KEY: optStr,
  SERPER_API_KEY: optStr,
  MEDIA_PROVIDER: optEnum(["kie", "higgsfield"], "kie"),
  KIE_API_KEY: optStr,
  KIE_CHAT_MODEL: z.preprocess(blank, z.string().min(1).default("claude-sonnet-4-5")),
  KIE_IMAGE_MODEL: z.preprocess(blank, z.string().min(1).default("gpt-image-2-text-to-image")),
  KIE_VIDEO_MODEL: optStr,
  KIE_AUDIO_MODEL: optStr,
  KIE_WEBHOOK_HMAC_KEY: optStr,
  HIGGSFIELD_API_KEY: optStr,
  MEDIA_WEBHOOK_SECRET: optStr,
  UNSPLASH_ACCESS_KEY: optStr,
  PEXELS_API_KEY: optStr,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}
