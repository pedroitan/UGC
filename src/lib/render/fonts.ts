import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SatoriOptions } from "satori";

// Fontes do design system (Fraunces + Manrope) lidas dos pacotes @fontsource.
// Satori aceita .woff/.ttf — os arquivos vivem em node_modules e são incluídos
// no bundle do servidor via outputFileTracingIncludes no next.config.

const FILES: {
  family: string;
  file: string;
  weight: NonNullable<SatoriOptions["fonts"]>[number]["weight"];
  style?: "normal" | "italic";
}[] = [
  { family: "Fraunces", file: "@fontsource/fraunces/files/fraunces-latin-600-normal.woff", weight: 600 },
  { family: "Fraunces", file: "@fontsource/fraunces/files/fraunces-latin-700-normal.woff", weight: 700 },
  { family: "Fraunces", file: "@fontsource/fraunces/files/fraunces-latin-500-italic.woff", weight: 500, style: "italic" },
  { family: "Manrope", file: "@fontsource/manrope/files/manrope-latin-400-normal.woff", weight: 400 },
  { family: "Manrope", file: "@fontsource/manrope/files/manrope-latin-600-normal.woff", weight: 600 },
  { family: "Manrope", file: "@fontsource/manrope/files/manrope-latin-700-normal.woff", weight: 700 },
  { family: "Manrope", file: "@fontsource/manrope/files/manrope-latin-800-normal.woff", weight: 800 },
];

let cached: SatoriOptions["fonts"] | null = null;

export async function loadFonts(): Promise<SatoriOptions["fonts"]> {
  if (cached) return cached;
  cached = await Promise.all(
    FILES.map(async ({ family, file, weight, style }) => ({
      name: family,
      data: await readFile(path.join(process.cwd(), "node_modules", file)),
      weight,
      style: style ?? ("normal" as const),
    })),
  );
  return cached;
}
