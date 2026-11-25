#!/usr/bin/env node
/**
 * Import the owner-provided seed dictionary into the app's typed locale
 * modules. Run once (and again if the seed changes):
 *
 *   node scripts/i18n-import-seed.mjs
 *
 * Only the seed's shell keys are imported. Everything else is English-only
 * until a translator fills it in; the UI falls back to English per key, so a
 * partial locale is always safe.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEED = path.join(ROOT, "docs/languages/ui-dictionary.seed.json");
const OUT = path.join(ROOT, "src/lib/i18n/locales");

const TIER1 = [
  "en",
  "ja",
  "es",
  "es-MX",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "zh",
  "ko",
  "hi",
  "ru",
];

const seed = JSON.parse(await readFile(SEED, "utf8"));
const strings = seed.strings;

await mkdir(OUT, { recursive: true });

function literal(value) {
  return JSON.stringify(value);
}

function render(code, entries) {
  const lines = entries.map(
    ([key, value]) => `  ${literal(key)}: ${literal(value)},`,
  );
  return `// Generated from docs/languages/ui-dictionary.seed.json by
// scripts/i18n-import-seed.mjs — edit the seed, not this file, for seed keys.
import type { Dictionary } from "../dictionary";

/** Seed translations for ${code}. Missing keys fall back to English. */
const dictionary: Partial<Dictionary> = {
${lines.join("\n")}
};

export default dictionary;
`;
}

for (const code of TIER1) {
  if (code === "en") continue;
  if (code === "es-MX") {
    // Variant locale: inherits es and stores only overrides.
    await writeFile(
      path.join(OUT, "es-MX.ts"),
      `// es-MX inherits es at runtime and stores only differing strings.
import type { Dictionary } from "../dictionary";

const dictionary: Partial<Dictionary> = {};

export default dictionary;
`,
    );
    continue;
  }

  const entries = Object.entries(strings)
    .map(([key, value]) => [key, value[code]])
    .filter(([, value]) => typeof value === "string" && value.length > 0);

  await writeFile(path.join(OUT, `${code}.ts`), render(code, entries));
}

console.log(`Imported ${Object.keys(strings).length} seed keys into ${TIER1.length} Tier-1 locales.`);
