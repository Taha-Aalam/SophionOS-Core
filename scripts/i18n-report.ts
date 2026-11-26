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

import { AVAILABLE_LOCALES } from "../src/lib/i18n/config";
import type { Dictionary } from "../src/lib/i18n/dictionary";
import en from "../src/lib/i18n/dictionary";
import bg from "../src/lib/i18n/locales/bg";
import bn from "../src/lib/i18n/locales/bn";
import cs from "../src/lib/i18n/locales/cs";
import da from "../src/lib/i18n/locales/da";
import de from "../src/lib/i18n/locales/de";
import el from "../src/lib/i18n/locales/el";
import es from "../src/lib/i18n/locales/es";
import esMX from "../src/lib/i18n/locales/es-MX";
import et from "../src/lib/i18n/locales/et";
import fi from "../src/lib/i18n/locales/fi";
import fil from "../src/lib/i18n/locales/fil";
import fr from "../src/lib/i18n/locales/fr";
import hi from "../src/lib/i18n/locales/hi";
import hr from "../src/lib/i18n/locales/hr";
import id from "../src/lib/i18n/locales/id";
import it from "../src/lib/i18n/locales/it";
import ja from "../src/lib/i18n/locales/ja";
import kk from "../src/lib/i18n/locales/kk";
import ko from "../src/lib/i18n/locales/ko";
import ky from "../src/lib/i18n/locales/ky";
import mn from "../src/lib/i18n/locales/mn";
import nl from "../src/lib/i18n/locales/nl";
import no from "../src/lib/i18n/locales/no";
import pl from "../src/lib/i18n/locales/pl";
import pt from "../src/lib/i18n/locales/pt";
import ro from "../src/lib/i18n/locales/ro";
import ru from "../src/lib/i18n/locales/ru";
import sv from "../src/lib/i18n/locales/sv";
import th from "../src/lib/i18n/locales/th";
import tr from "../src/lib/i18n/locales/tr";
import uk from "../src/lib/i18n/locales/uk";
import vi from "../src/lib/i18n/locales/vi";
import zh from "../src/lib/i18n/locales/zh";

const DICTIONARIES: Record<string, Partial<Dictionary>> = {
  bg, bn, cs, da, de, el, es, "es-MX": esMX, et, fi, fil, fr, hi, hr, id, it,
  ja, kk, ko, ky, mn, nl, no, pl, pt, ro, ru, sv, th, tr, uk, vi, zh,
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

for (const locale of AVAILABLE_LOCALES) {
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
