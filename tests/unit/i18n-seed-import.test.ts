import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../scripts/i18n-import-seed.mjs", import.meta.url));
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(
  strings: Record<string, Record<string, string>>,
  stored: Record<string, Record<string, string>>,
): string {
  const dir = mkdtempSync(join(tmpdir(), "i18n-seed-guard-"));
  dirs.push(dir);
  mkdirSync(join(dir, "docs/languages"), { recursive: true });
  mkdirSync(join(dir, "src/lib/i18n/locales"), { recursive: true });
  writeFileSync(
    join(dir, "docs/languages/ui-dictionary.seed.json"),
    JSON.stringify({ strings }),
  );
  for (const [code, entries] of Object.entries(stored)) {
    const lines = Object.entries(entries)
      .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
      .join("\n");
    writeFileSync(
      join(dir, "src/lib/i18n/locales", `${code}.ts`),
      `import type { Dictionary } from "../dictionary";\nconst dictionary: Partial<Dictionary> = {\n${lines}\n};\nexport default dictionary;\n`,
    );
  }
  return dir;
}

function run(dir: string, ...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
  });
}

const seed = { "nav.tasks": { de: "Aufgaben", es: "Tareas", ja: "タスク" } };
const deFile = (dir: string) => join(dir, "src/lib/i18n/locales/de.ts");

describe("i18n seed import guard", () => {
  it("aborts and writes nothing when local translations would be lost", () => {
    const dir = fixture(seed, {
      de: { "nav.tasks": "Aufgaben", "chrome.core": "Kern", "chrome.system": "System" },
      es: { "nav.tasks": "Tareas distintas" },
    });
    const before = readFileSync(deFile(dir), "utf8");
    const result = run(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("aborted");
    expect(result.stderr).toContain("No files were written");
    expect(result.stderr).toContain("de: 2 translation(s) would be lost (2 dropped, 0 changed)");
    expect(result.stderr).toContain("chrome.core");
    expect(result.stderr).toContain("es: 1 translation(s) would be lost (0 dropped, 1 changed)");
    expect(readFileSync(deFile(dir), "utf8")).toBe(before);
    expect(existsSync(join(dir, "src/lib/i18n/locales/fr.ts"))).toBe(false);
  });

  it("--force overwrites drift and prints the loss report as a warning", () => {
    const dir = fixture(seed, { de: { "nav.tasks": "Aufgaben", "chrome.core": "Kern" } });
    const result = run(dir, "--force");

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("WARNING");
    expect(result.stderr).toContain("de: 1 translation(s) would be lost (1 dropped, 0 changed)");
    expect(result.stderr).toContain("chrome.core");
    expect(readFileSync(deFile(dir), "utf8")).not.toContain("chrome.core");
    expect(result.stdout).toContain("Imported 1 seed keys");
  });

  it("adds genuinely new seed keys when there is no drift", () => {
    const dir = fixture(
      { ...seed, "chrome.core": { de: "Kern", es: "Núcleo", ja: "コア" } },
      { de: { "nav.tasks": "Aufgaben" } },
    );
    const result = run(dir);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Imported 2 seed keys");
    expect(readFileSync(deFile(dir), "utf8")).toContain('"chrome.core": "Kern"');
  });
});
