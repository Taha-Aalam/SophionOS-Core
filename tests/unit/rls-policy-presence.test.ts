import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Structural guard: core user-owned tables must have RLS-related SQL in
 * migrations. Full dual-user JWT tests need a live Supabase fixture.
 */
describe("RLS policy presence in migrations", () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");

  it("ships migration files", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(10);
  });

  it("enables RLS or creates policies for core entities", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    const combined = files
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n");

    const lower = combined.toLowerCase();
    expect(lower).toMatch(/enable row level security|create policy/);

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
      expect(lower).toContain(table);
    }

    // Clerk JWT subject comparison appears in the Clerk RLS rewrite era.
    expect(combined).toMatch(/auth\.jwt\(\)\s*->>\s*'sub'|auth\.uid\(\)/);
  });

  it("does not embed obvious live service-role JWT blobs in migrations", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    for (const f of files) {
      const text = readFileSync(join(migrationsDir, f), "utf8");
      expect(text).not.toMatch(/eyJhbGciOiJ/);
      expect(text).not.toMatch(/sk_live_/);
      expect(text).not.toMatch(/sk_test_[a-zA-Z0-9]{20,}/);
    }
  });
});
