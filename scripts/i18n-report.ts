/**
 * Per-locale untranslated-key report.
 *
 * The extraction sweep adds English keys for the whole UI. Translators fill
 * them in incrementally; the runtime falls back to English per key. This
 * script is the work queue: how many keys each locale still needs, and exactly
 * which ones.
 *
 * Run: pnpm i18n:report   (or: npx tsx scripts/i18n-report.ts)
 */
import { writeFile } from "node:fs/promises";

import { TIER1_LOCALES } from "../src/lib/i18n/config";
import type { Dictionary } from "../src/lib/i18n/dictionary";
import en from "../src/lib/i18n/dictionary";
import de from "../src/lib/i18n/locales/de";
import es from "../src/lib/i18n/locales/es";
import esMX from "../src/lib/i18n/locales/es-MX";
import fr from "../src/lib/i18n/locales/fr";
import hi from "../src/lib/i18n/locales/hi";
import it from "../src/lib/i18n/locales/it";
import ja from "../src/lib/i18n/locales/ja";
import ko from "../src/lib/i18n/locales/ko";
import nl from "../src/lib/i18n/locales/nl";
import pt from "../src/lib/i18n/locales/pt";
import ru from "../src/lib/i18n/locales/ru";
import zh from "../src/lib/i18n/locales/zh";

const DICTIONARIES: Record<string, Partial<Dictionary>> = {
  de, es, "es-MX": esMX, fr, hi, it, ja, ko, nl, pt, ru, zh,
};

const EN_KEYS = Object.keys(en) as Array<keyof Dictionary>;

const rows: Array<{
  code: string;
  name: string;
  translated: number;
  missing: number;
  percent: number;
  missingKeys: string[];
}> = [];

for (const locale of TIER1_LOCALES) {
  if (locale.code === "en") continue;

  // es-MX inherits es: a key is covered if either file has it.
  const own = DICTIONARIES[locale.code] ?? {};
  const inherited = locale.inherits ? DICTIONARIES[locale.inherits] ?? {} : {};
  const missingKeys = EN_KEYS.filter((key) => {
    const value = own[key] ?? inherited[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  rows.push({
    code: locale.code,
    name: locale.nativeName,
    translated: EN_KEYS.length - missingKeys.length,
    missing: missingKeys.length,
    percent: Math.round(((EN_KEYS.length - missingKeys.length) / EN_KEYS.length) * 100),
    missingKeys,
  });
}

const lines: string[] = [
  "# Untranslated UI keys by locale",
  "",
  `Generated from \`src/lib/i18n/dictionary.ts\` (${EN_KEYS.length} English keys).`,
  "Missing keys fall back to English at runtime, so a partial locale is safe.",
  "",
  "| Locale | Language | Translated | Missing | Coverage |",
  "| --- | --- | ---: | ---: | ---: |",
];

for (const row of rows) {
  lines.push(
    `| ${row.code} | ${row.name} | ${row.translated} | ${row.missing} | ${row.percent}% |`,
  );
}

lines.push("", "## Keys still untranslated", "");

for (const row of rows) {
  if (row.missing === 0) continue;
  lines.push(`### ${row.code} — ${row.name} (${row.missing})`, "");
  for (const key of row.missingKeys) lines.push(`- \`${key}\``);
  lines.push("");
}

async function main() {
  const report = lines.join("\n");
  await writeFile("docs/languages/untranslated-report.md", report);
  console.log(report);
}

void main();
