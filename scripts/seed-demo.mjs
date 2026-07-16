#!/usr/bin/env node
/**
 * Applies synthetic demo seed for local evaluation.
 * Prefer: npx supabase db reset (migrations + supabase/seed.sql)
 *
 * This script documents the path and, when `psql` + DATABASE_URL are available,
 * re-runs seed.sql with optional SEED_USER_ID.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = join(root, "supabase", "seed.sql");

if (!existsSync(seedPath)) {
  console.error("Missing supabase/seed.sql");
  process.exit(1);
}

const seedSql = readFileSync(seedPath, "utf8");
if (!/synthetic|demo|example\.com/i.test(seedSql)) {
  console.error("Refusing to run seed that does not look synthetic");
  process.exit(1);
}

console.log("SophionOS demo seed");
console.log("--------------------");
console.log("Seed file:", seedPath);
console.log("Synthetic personas: docs/demo-users/");
console.log("");
console.log("Recommended (local Supabase):");
console.log("  npx supabase db reset");
console.log("");
console.log("To attach seed rows to your Clerk user, set before reset:");
console.log("  (in SQL) select set_config('app.seed_user_id', 'user_xxx', false);");
console.log("Or re-run seed.sql after substituting SEED_USER_ID.");
console.log("");

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.log("No DATABASE_URL / SUPABASE_DB_URL — documentation path only (exit 0).");
  console.log("After migrations, open the app and/or run supabase db reset for SQL seed.");
  process.exit(0);
}

const seedUser = process.env.SEED_USER_ID;
let sql = seedSql;
if (seedUser) {
  sql = `select set_config('app.seed_user_id', '${seedUser.replace(/'/g, "''")}', false);\n` + sql;
}

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  encoding: "utf8",
  shell: true,
});

if (result.error) {
  console.error("psql failed to start:", result.error.message);
  console.error("Fall back to: npx supabase db reset");
  process.exit(1);
}
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log("Seed applied via psql.");
