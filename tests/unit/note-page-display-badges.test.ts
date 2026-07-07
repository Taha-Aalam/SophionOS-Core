import { describe, expect, it } from "vitest";

import {
  NOTES_RELATION_BADGE_CLASS_NAME,
  NOTES_RELATION_BADGE_LIMIT_CLASS_NAME,
} from "../../src/lib/utils/note-page-display";

describe("note page badge display helpers", () => {
  it("uses wrap-safe relation badges so long labels are not clipped", () => {
    expect(NOTES_RELATION_BADGE_CLASS_NAME).toContain("whitespace-normal");
    expect(NOTES_RELATION_BADGE_CLASS_NAME).toContain("h-auto");
    expect(NOTES_RELATION_BADGE_CLASS_NAME).toContain("max-w-full");
  });

  it("keeps overflow counters compact while matching the table style", () => {
    expect(NOTES_RELATION_BADGE_LIMIT_CLASS_NAME).toContain("text-2xs");
  });
});
