import { describe, expect, it } from "vitest";

import { DEFAULT_AREAS } from "@/lib/onboarding/default-areas";

describe("default area seeds", () => {
  it("matches the roadmap and PRD defaults in the documented order", () => {
    expect(DEFAULT_AREAS.map((area) => area.name)).toEqual([
      "Work",
      "Health",
      "Finances",
      "Personal Growth",
      "Family & Friends",
      "Home",
      "Travel",
      "Career",
      "Inception Vault",
    ]);
  });

  it("keeps the seeded set limited to the nine documented defaults", () => {
    expect(DEFAULT_AREAS).toHaveLength(9);
  });
});
