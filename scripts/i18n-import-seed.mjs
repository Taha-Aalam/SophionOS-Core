#!/usr/bin/env node
/**
 * Import the owner-provided seed dictionary into the app's typed locale
 * modules. Run once (and again if the seed changes):
 *
 *   node scripts/i18n-import-seed.mjs
 *
 * Locale files can be extended by hand after the import (the Tier-1 parity
 * translations are). Re-importing would silently drop that work, so the script
 * compares its output with the files on disk first and aborts on any drift.
 * Pass --force to overwrite intentionally.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEED = path.join(ROOT, "docs/languages/ui-dictionary.seed.json");
const OUT = path.join(ROOT, "src/lib/i18n/locales");
const FORCE = process.argv.includes("--force");
const EXAMPLES = 5;

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

/** Read the key/value lines of an existing locale module without importing TS. */
async function readStored(code) {
  const file = path.join(OUT, `${code}.ts`);
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
  const entries = new Map();
  const line = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*(.*?),?\s*$/gm;
  for (const match of source.matchAll(line)) {
    const key = JSON.parse(`"${match[1]}"`);
    const raw = match[2].trim().replace(/,$/, "");
    let value = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      // Non-literal value: keep the source text so it still counts as drift.
    }
    entries.set(key, value);
  }
  return entries;
}

function lossReport(losses) {
  const lines = ["Per-locale loss report:", ""];
  for (const { code, dropped, changed } of losses) {
    const examples = [...dropped, ...changed].slice(0, EXAMPLES).join(", ");
    lines.push(
      `${code}: ${dropped.length + changed.length} translation(s) would be lost ` +
        `(${dropped.length} dropped, ${changed.length} changed)`,
    );
    lines.push(`  examples: ${examples}`);
  }
  return lines.join("\n");
}

// Plan every file first: no writes (not even mkdir) until drift is cleared.
const plans = TIER1.filter((code) => code !== "en").map((code) => {
  const entries = code === "es-MX"
    ? []
    : Object.entries(strings)
        .map(([key, value]) => [key, value[code]])
        .filter(([, value]) => typeof value === "string" && value.length > 0);
  return { code, entries };
});

const losses = [];
for (const { code, entries } of plans) {
  const current = await readStored(code);
  const next = new Map(entries);
  const dropped = [...current.keys()].filter((key) => !next.has(key));
  const changed = [...current.entries()]
    .filter(([key, value]) => next.has(key) && next.get(key) !== value)
    .map(([key]) => key);
  if (dropped.length > 0 || changed.length > 0) losses.push({ code, dropped, changed });
}

if (losses.length > 0) {
  const report = lossReport(losses);
  if (!FORCE) {
    console.error(
      `i18n seed import aborted: ${losses.length} locale file(s) have drifted from the seed.\n` +
        `No files were written. Re-run with --force to overwrite deliberately.\n\n${report}`,
    );
    process.exit(1);
  }
  console.warn(
    `WARNING: i18n seed import --force is overwriting drifted locale files.\n${report}`,
  );
}

await mkdir(OUT, { recursive: true });
for (const { code, entries } of plans) {
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
  await writeFile(path.join(OUT, `${code}.ts`), render(code, entries));
}

console.log(`Imported ${Object.keys(strings).length} seed keys into ${TIER1.length} Tier-1 locales.`);
