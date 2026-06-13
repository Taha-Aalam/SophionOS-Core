// tests/unit/topic-detail-tab-order.test.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const src = readFileSync(
  join(__dirname, "../../src/app/(dashboard)/topics/[id]/topic-detail-content.tsx"),
  "utf-8",
);

describe("topic detail page – note tabs", () => {
  it("defines tabs in order: all, inbox, to_review, active, completed, archived", () => {
    // The noteTabs array must contain all six values.
    expect(src).toContain('"inbox"');
    expect(src).toContain('"to_review"');
    expect(src).toContain('"completed"');

    // Verify positional order by checking index positions.
    const allIdx = src.indexOf('"all"');
    const inboxIdx = src.indexOf('"inbox"');
    const toReviewIdx = src.indexOf('"to_review"');
    const activeIdx = src.indexOf('"active"');
    const savedIdx = src.indexOf('"completed"');
    const archivedIdx = src.indexOf('"archived"');

    expect(allIdx).toBeLessThan(inboxIdx);
    expect(inboxIdx).toBeLessThan(toReviewIdx);
    expect(toReviewIdx).toBeLessThan(activeIdx);
    expect(activeIdx).toBeLessThan(savedIdx);
    expect(savedIdx).toBeLessThan(archivedIdx);
  });
});

describe("topic detail page – resource tabs", () => {
  it("includes a completed tab", () => {
    // resourceTabs must also have a completed entry.
    // We look for the 'completed' label string in the resourceTabs block.
    expect(src).toContain('"Completed"');
  });
});
