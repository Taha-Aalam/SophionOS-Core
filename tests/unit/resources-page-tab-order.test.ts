import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fullSrc = readFileSync(
  join(__dirname, "../../src/app/(dashboard)/resources/resources-content.tsx"),
  "utf-8",
);

// Scope the search to the TabsList block so import names don't produce false matches.
const tabsStart = fullSrc.indexOf("<TabsList");
const tabsEnd = fullSrc.indexOf("</TabsList>") + "</TabsList>".length;
const src = fullSrc.slice(tabsStart, tabsEnd);

describe("resources page tab order", () => {
  it("defines the requested tabs in the requested order", () => {
    const orderedLabels = [
      "All",
      "Inbox",
      "To Review",
      "Active",
      "Favorite",
      "By Topic",
      "By Area",
      "By Goal",
      "By Project",
      "Saved",
      "Archived",
    ];

    let previousIndex = -1;
    for (const label of orderedLabels) {
      const index = src.indexOf(label);
      expect(index, `"${label}" not found in TabsList after previous labels`).toBeGreaterThan(-1);
      expect(index, `"${label}" appears before previous label`).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
});
