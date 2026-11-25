#!/usr/bin/env node
/**
 * i18n audit — Step 0 baseline + ongoing guard.
 *
 * Counts hard-coded user-visible English strings in the UI layer using the
 * TypeScript AST, so code identifiers and class names are never counted.
 *
 * What counts:
 *   - JSX text nodes with at least one letter (copy shown to the user).
 *   - JSX attribute literals for user-facing props: placeholder, aria-label,
 *     title, alt, label, description, and the common dialog copy props.
 *   - Toast calls (`toast.success("…")`, `toast.error("…")`) in UI files.
 *
 * What does not count: identifiers, class names, hrefs, data attributes, test
 * ids, enum values, API paths, query keys, or strings passed to non-UI helpers.
 *
 * Usage:
 *   node scripts/i18n-audit.mjs            # human summary
 *   node scripts/i18n-audit.mjs --json     # machine readable
 *   node scripts/i18n-audit.mjs --md       # markdown table (PR body)
 */
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// Area order matters: first match wins, most specific / shell first.
const AREAS = [
  {
    id: "shell",
    label: "Shell / navigation",
    match: (p) =>
      p.startsWith("components/layout/") ||
      p.startsWith("components/providers/") ||
      p.startsWith("components/bug-report/"),
  },
  {
    id: "settings",
    label: "Settings",
    match: (p) => p.includes("settings/") || p.includes("settings-"),
  },
  { id: "dashboard", label: "Dashboard", match: (p) => p.includes("dashboard") },
  { id: "tasks", label: "Tasks", match: (p) => p.includes("task") },
  { id: "goals", label: "Goals", match: (p) => p.includes("goal") },
  { id: "projects", label: "Projects", match: (p) => p.includes("project") },
  { id: "areas", label: "Areas", match: (p) => p.includes("area") },
  { id: "notes", label: "Notes", match: (p) => p.includes("note") },
  {
    id: "toasts-errors",
    label: "Toasts / errors",
    match: (p) => p.includes("toast") || p.includes("error") || p.includes("notification"),
  },
];

const USER_FACING_ATTRS = new Set([
  "placeholder",
  "aria-label",
  "aria-description",
  "title",
  "alt",
  "label",
  "description",
  "heading",
  "confirmText",
  "cancelText",
  "emptyMessage",
  "emptyDescription",
]);

function areaFor(rel) {
  // Strip the Next.js route group (`(dashboard)`, `(trust)`, …) so page files
  // are classified by their real area, not by the literal word "dashboard".
  const clean = rel.replace(/^app\/\([^)]*\)\//, "app/");
  for (const area of AREAS) if (area.match(clean)) return area;
  return { id: "remaining", label: "Remaining pages" };
}

function normalise(text) {
  return text.replace(/\s+/g, " ").trim();
}

function looksLikeCopy(text) {
  const t = normalise(text);
  if (t.length < 2) return false;
  if (!/[A-Za-z\u00C0-\u024F\u0400-\u04FF]/.test(t)) return false;
  if (/^[a-z0-9_-]+$/i.test(t) && t.length < 4) return false;
  if (/^[A-Z][A-Z0-9_]+$/.test(t)) return false; // CONSTANTS
  return true;
}

function attributeText(attr) {
  if (!ts.isJsxAttribute(attr)) return null;
  const name = attr.name.getText();
  if (!USER_FACING_ATTRS.has(name)) return null;
  const init = attr.initializer;
  if (!init) return null;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    const expr = init.expression;
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
    if (ts.isTemplateExpression(expr)) {
      // Count once, with interpolations normalised.
      return expr.getText().slice(1, -1).replace(/\$\{[^}]*\}/g, "{}");
    }
  }
  return null;
}

function extract(source, rel) {
  const sourceFile = ts.createSourceFile(
    rel,
    source,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const found = [];

  function walk(node) {
    if (ts.isJsxText(node)) {
      const text = normalise(node.text);
      if (looksLikeCopy(text)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        found.push({ line, text, kind: "jsx-text" });
      }
    }

    if (ts.isJsxAttribute(node)) {
      const text = attributeText(node);
      if (text && looksLikeCopy(text)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        found.push({ line, text: normalise(text), kind: "attribute" });
      }
    }

    // toast.success("…") / toast.error("…")
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "toast" &&
      node.arguments.length > 0
    ) {
      const [first] = node.arguments;
      if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
        if (looksLikeCopy(first.text)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          found.push({ line, text: normalise(first.text), kind: "toast" });
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);

  const seen = new Set();
  return found
    .filter((item) => {
      const key = `${item.line}:${item.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ ...item, file: rel }));
}

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next"].includes(entry.name)) continue;
      yield* walkFiles(full);
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      // Skip the shadcn primitives: they are generic, mostly unlabelled chrome.
      if (entry.name.endsWith(".test.tsx")) continue;
      yield full;
    }
  }
}

/** `--rev <rev>`: audit a git revision instead of the working tree (Step 0). */
const revIndex = process.argv.indexOf("--rev");
const REV = revIndex >= 0 ? process.argv[revIndex + 1] : null;

async function* sources() {
  if (REV) {
    const files = execFileSync("git", ["ls-tree", "-r", "--name-only", REV, "--", "src"], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file) || file.endsWith(".test.tsx")) continue;
      const source = execFileSync("git", ["show", `${REV}:${file}`], { encoding: "utf8" });
      yield { rel: file.replace(/^src\//, ""), source };
    }
    return;
  }

  for await (const file of walkFiles(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    yield { rel, source: await readFile(file, "utf8") };
  }
}

const byArea = new Map();
let total = 0;

for await (const { rel, source } of sources()) {
  if (rel.startsWith("components/ui/")) continue;
  const hits = extract(source, rel);
  if (hits.length === 0) continue;
  const area = areaFor(rel);
  if (!byArea.has(area.id)) byArea.set(area.id, { ...area, count: 0, files: new Map() });
  const bucket = byArea.get(area.id);
  bucket.count += hits.length;
  for (const hit of hits) {
    if (!bucket.files.has(rel)) bucket.files.set(rel, []);
    bucket.files.get(rel).push(hit);
  }
  total += hits.length;
}

const ordered = [
  "shell",
  "settings",
  "dashboard",
  "tasks",
  "goals",
  "projects",
  "areas",
  "notes",
  "toasts-errors",
  "remaining",
]
  .map((id) => byArea.get(id))
  .filter(Boolean);

const report = {
  revision: REV ?? "working-tree",
  generatedAt: new Date().toISOString(),
  total,
  areas: ordered.map((area) => ({
    id: area.id,
    label: area.label,
    count: area.count,
    files: area.files.size,
  })),
  detail: Object.fromEntries(
    ordered.map((area) => [
      area.id,
      Object.fromEntries(
        [...area.files.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([file, hits]) => [
            file,
            hits.map((h) => ({ line: h.line, text: h.text, kind: h.kind })),
          ]),
      ),
    ]),
  ),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else if (process.argv.includes("--md")) {
  console.log(`| Area | Strings | Files |`);
  console.log(`| --- | ---: | ---: |`);
  for (const area of report.areas) {
    console.log(`| ${area.label} | ${area.count} | ${area.files} |`);
  }
  console.log(`| **Total** | **${report.total}** | |`);
} else {
  console.log(
    `i18n audit (${report.revision}) — ${report.total} hard-coded user-visible strings\n`,
  );
  for (const area of report.areas) {
    console.log(
      `${area.label.padEnd(22)} ${String(area.count).padStart(5)}  (${area.files} files)`,
    );
  }
  console.log(`\nDetail: node scripts/i18n-audit.mjs --json`);
}
