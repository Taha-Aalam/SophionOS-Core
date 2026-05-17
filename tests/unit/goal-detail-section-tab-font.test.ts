// tests/unit/goal-detail-section-tab-font.test.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const src = readFileSync(
  join(__dirname, "../../src/components/entities/goal-detail-section.tsx"),
  "utf-8",
);

describe("GoalDetailSection – tab trigger font size", () => {
  it("uses text-sm (not text-[0.8125rem]) for TabsTrigger", () => {
    expect(src).not.toContain("text-[0.8125rem]");
    expect(src).toMatch(/TabsTrigger[^>]*text-sm/);
  });
});
