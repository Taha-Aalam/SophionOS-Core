/**
 * Fails if a data /api/v1 route.ts lacks a ROUTE_PERMISSIONS map entry
 * (user/billing/webhook routes are exempt).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1Root = path.join(root, "src", "app", "api", "v1");

const EXEMPT_PREFIXES = [
  "user/",
  "billing/",
  "mcp/", // health only — still mapped; keep listed
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === "route.ts") out.push(p);
  }
  return out;
}

function fileToKey(file) {
  let rel = path.relative(v1Root, path.dirname(file)).replace(/\\/g, "/");
  if (rel === ".") return "";
  // [id] → :id
  return rel
    .split("/")
    .map((seg) => (seg.startsWith("[") && seg.endsWith("]") ? ":id" : seg))
    .join("/");
}

// Dynamic import of compiled TS is hard; parse the TS map with a simple regex.
const mapPath = path.join(root, "src", "lib", "api", "route-permissions.ts");
const mapSrc = fs.readFileSync(mapPath, "utf8");
const keys = new Set();
for (const m of mapSrc.matchAll(/"([^"]+)":\s*\{/g)) {
  keys.add(m[1]);
}

const routes = walk(v1Root);
const missing = [];
const covered = [];

for (const file of routes) {
  const key = fileToKey(file);
  if (!key) continue;
  if (key.startsWith("user/") || key.startsWith("billing/")) continue;
  if (key.includes("__tests__")) continue;
  if (!keys.has(key)) missing.push(key);
  else covered.push(key);
}

const report = {
  covered: covered.length,
  missing,
  mapSize: keys.size,
};

const outDir = process.env.SCRATCH || process.cwd();
const outFile = path.join(outDir, "route-permission-coverage.log");
const text = [
  `route-permission coverage`,
  `map entries: ${keys.size}`,
  `data routes covered: ${covered.length}`,
  `missing: ${missing.length}`,
  ...missing.map((m) => `  - ${m}`),
  "",
].join("\n");

try {
  fs.writeFileSync(outFile, text, "utf8");
} catch {
  /* ignore */
}

console.log(text);

if (missing.length > 0) {
  process.exitCode = 1;
}
