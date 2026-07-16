#!/usr/bin/env node
/**
 * Structural migration gate for environments without full Supabase runtime.
 * Ensures migrations ship and include RLS-related SQL for core entities.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (files.length < 10) {
  console.error(`Expected ≥10 migration files, found ${files.length}`);
  process.exit(1);
}

const combined = files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const lower = combined.toLowerCase();

if (!/enable row level security|create policy/.test(lower)) {
  console.error("Migrations must enable RLS or create policies");
  process.exit(1);
}

for (const table of [
  "areas",
  "goals",
  "projects",
  "tasks",
  "notes",
  "resources",
  "topics",
  "contacts",
]) {
  if (!lower.includes(table)) {
    console.error(`Missing table mention: ${table}`);
    process.exit(1);
  }
}

if (!/auth\.jwt\(\)\s*->>\s*'sub'|auth\.uid\(\)/.test(combined)) {
  console.error("Migrations must reference auth.jwt()->sub or auth.uid()");
  process.exit(1);
}

// No JWT blobs or live sk keys in migrations
if (/eyJhbGciOiJ/.test(combined) || /sk_live_/.test(combined)) {
  console.error("Migrations appear to contain secret material");
  process.exit(1);
}

console.log(`OK: ${files.length} migrations; RLS structural checks passed`);
