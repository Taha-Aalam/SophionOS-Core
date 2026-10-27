import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Structural regression for audit findings 8 and 10
// (sophionos-core-20261026-r1):
//
// - `github/workflows/security-nightly.yml:pnpm-dlx-unpinned-tsx`: CI ran
//   `pnpm dlx tsx` — an unpinned, registry-resolved binary — inside the
//   step whose env carries RLS_MATRIX_SERVICE_ROLE_KEY. The runner must be
//   an exact-pinned devDependency executed via `pnpm exec`, and the
//   lockfile must carry that exact version.
// - `supabase/config.toml@git-history-oauth-client-secret`: the repo adds
//   an explicit gitleaks rule for the Google OAuth client-secret class so
//   it is caught by name; the rule must stay present.

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist") continue;
      acc.push(...walk(p, acc));
    } else {
      acc.push(p);
    }
  }
  return acc;
}

describe("no workflow invokes unpinned pnpm dlx", () => {
  it("no .github/workflows file contains 'pnpm dlx'", () => {
    const workflowsDir = join(ROOT, ".github", "workflows");
    const files = readdirSync(workflowsDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((f) => join(workflowsDir, f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} must not use pnpm dlx`).not.toMatch(/pnpm\s+dlx\b/);
    }
  });

  it("tsx is an exact-pinned devDependency matching the lockfile", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const pinned = pkg.devDependencies?.tsx;
    expect(pinned, "tsx must be declared as a devDependency").toBeDefined();
    // Exact pin: no range specifiers.
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);

    const lockfile = readFileSync(join(ROOT, "pnpm-lock.yaml"), "utf8");
    // The lockfile must resolve exactly the pinned version — every
    // `tsx@<version>:` snapshot entry must equal the manifest pin.
    const versions = [...lockfile.matchAll(/tsx@(\d+\.\d+\.\d+):/g)].map(
      (m) => m[1],
    );
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      expect(version).toBe(pinned);
    }
  });

  it("the nightly RLS-matrix step runs the pinned binary via pnpm exec", () => {
    const nightly = readFileSync(
      join(ROOT, ".github", "workflows", "security-nightly.yml"),
      "utf8",
    );
    expect(nightly).toContain("pnpm exec tsx scripts/security/rls-matrix.ts");
  });

  it("gitleaks config carries the explicit Google OAuth client-secret rule", () => {
    const config = readFileSync(join(ROOT, ".gitleaks.toml"), "utf8");
    expect(config).toContain("google-oauth-client-secret");
    expect(config).toMatch(/GOCSPX-\[A-Za-z0-9_-\]/);
  });
});
