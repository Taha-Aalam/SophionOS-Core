import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
const SRC = path.join(process.cwd(), "src");
const SKIP = new Set(["Pro", "URL", "of", "No", "not", "you", "Add"]);
const camel = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).map((p, i) => i ? p[0].toUpperCase() + p.slice(1) : p).join("");
const dict = await readFile(path.join(SRC, "lib/i18n/dictionary.ts"), "utf8");
const en = {}, enKeys = new Set();
for (const m of dict.matchAll(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",/gm)) { en[m[1]] = m[2]; enKeys.add(m[1]); }
const byValue = new Map(Object.entries(en).map(([k, v]) => [v, k]));
const newKeys = new Map();
async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (["node_modules", ".next"].includes(e.name)) continue; yield* walk(f); } else if (f.endsWith(".tsx") && !f.endsWith(".test.tsx")) yield f; } }
let count = 0;
for await (const abs of walk(SRC)) {
  const rel = path.relative(SRC, abs);
  if (rel.startsWith("components/ui/") || /app\/\(trust\)\/(privacy|terms|security|subprocessors|data-and-ai|responsible-disclosure)\//.test(rel)) continue;
  let source = await readFile(abs, "utf8");
  if (!source.includes("useI18n")) continue;
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const targets = [];
  const w = (n) => {
    if (ts.isJsxText(n)) {
      const t = n.text.replace(/\s+/g, " ").trim();
      if (/^[A-Za-z]{2,3}$/.test(t) && !SKIP.has(t)) targets.push({ node: n, start: n.getFullStart() + (n.text.match(/^\s*/)[0]).length, end: n.getEnd() - (n.text.match(/\s*$/)[0]).length, text: t });
    }
    ts.forEachChild(n, w);
  };
  w(sf);
  if (!targets.length) continue;
  const ns = camel(path.basename(rel).replace(/\.(tsx|jsx)$/, ""));
  const edits = [];
  for (const t of targets) {
    let key = byValue.get(t.text);
    if (!key) {
      key = `${ns}.${camel(t.text)}`;
      let n = 2; while (newKeys.has(key) || enKeys.has(key)) key = `${ns}.${camel(t.text)}${n++}`;
      newKeys.set(key, t.text); enKeys.add(key);
    }
    edits.push({ start: t.start, end: t.end, text: `{t("${key}")}` });
  }
  for (const e of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, e.start) + e.text + source.slice(e.end);
  await writeFile(abs, source);
  console.log(rel, edits.length); count += edits.length;
}
const close = "} as const;"; const idx = dict.lastIndexOf(close);
const block = ["", "  // ── Phase 2: short UI tokens ────────────────────────────────────────────"];
for (const [k, v] of newKeys) block.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
await writeFile(path.join(SRC, "lib/i18n/dictionary.ts"), dict.slice(0, idx) + block.join("\n") + "\n" + dict.slice(idx));
console.log("count", count, "newKeys", newKeys.size, [...newKeys.keys()]);
