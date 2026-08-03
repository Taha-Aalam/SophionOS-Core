#!/usr/bin/env node
/**
 * Quarterly clone-detection sweep.
 *
 * Usage:
 *   node scripts/canary-search.mjs                      # print search URLs only
 *   GITHUB_TOKEN=... node scripts/canary-search.mjs     # also query GitHub code search
 *   node scripts/canary-search.mjs --manifest path.json # custom manifest
 *
 * The manifest is the gitignored canaries.manifest.json (see
 * docs/canaries-manifest.example.md). Falls back to the repo's current markers.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const DEFAULT_CANARIES = [
  { id: "api-release-tag", value: "sphn-0x2f9c", notes: "API meta.ver" },
  { id: "html-generator", value: "sophonios-2026.3", notes: "<meta name=\"generator\">" },
  { id: "seed-area", value: "Inception Vault", notes: "onboarding default area" },
];

const manifestPath =
  process.argv.find((a) => a.startsWith("--manifest="))?.split("=")[1] ??
  join(root, "canaries.manifest.json");

function loadCanaries() {
  if (existsSync(manifestPath)) {
    const raw = readFileSync(manifestPath, "utf8");
    return JSON.parse(raw).canaries ?? [];
  }
  return DEFAULT_CANARIES;
}

const canaries = loadCanaries();
const canonicalRepo = process.env.GITHUB_REPOSITORY ?? "Taha-Aalam/SophionOS-Core";

function searchUrls(value) {
  const quoted = encodeURIComponent(`"${value}"`);
  return [
    `https://github.com/search?q=${quoted}&type=code`,
    `https://www.google.com/search?q=${quoted}`,
    `https://sourcegraph.com/search?q=context:global+${quoted}`,
  ];
}

async function githubApiSearch(value) {
  const url = `https://api.github.com/search/code?q=${encodeURIComponent(`"${value}"`)}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 401) return { error: "bad GITHUB_TOKEN" };
  if (res.status === 403) return { error: "rate-limited by GitHub API" };
  if (!res.ok) return { error: `GitHub API ${res.status}` };
  const body = await res.json();
  const hits = (body.items ?? [])
    .map((item) => `${item.repository.full_name} :: ${item.path}`)
    .filter((line) => !line.startsWith(`${canonicalRepo} ::`));
  return { hits, total: body.total_count };
}

for (const canary of canaries) {
  console.log(`\n=== ${canary.id} (${canary.value}) — ${canary.notes} ===`);
  for (const url of searchUrls(canary.value)) console.log(`  ${url}`);
  if (process.env.GITHUB_TOKEN) {
    const result = await githubApiSearch(canary.value);
    if (result.error) {
      console.log(`  [skipped] ${result.error}`);
    } else if (result.hits.length === 0) {
      console.log(`  [clean] no hits outside ${canonicalRepo}`);
    } else {
      console.log(`  [ALERT] ${result.total} hit(s) outside canonical repo:`);
      for (const line of result.hits.slice(0, 20)) console.log(`    ${line}`);
    }
  }
}
