import { describe, expect, it } from "vitest";

import type { Area } from "@/lib/types/domain.types";
import { sortAreasForDisplay } from "@/lib/utils/areas";

function buildArea(overrides: Partial<Area> = {}): Area {
  return {
    archive: false,
    color: null,
    created_at: "2026-01-01T00:00:00.000Z",
    description: null,
    icon: null,
    id: "area-id",
    inactive: false,
    metadata: null,
    name: "Area",
    slug: "area",
    type: "Personal",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-id",
    ...overrides,
  };
}

describe("sortAreasForDisplay", () => {
  it("sorts by normalized type then name then created_at", () => {
    const result = sortAreasForDisplay([
      buildArea({ id: "3", type: "personal", name: "Zulu", created_at: "2026-01-03T00:00:00.000Z" }),
      buildArea({ id: "1", type: "business", name: "Alpha", created_at: "2026-01-01T00:00:00.000Z" }),
      buildArea({ id: "2", type: "Business", name: "Bravo", created_at: "2026-01-02T00:00:00.000Z" }),
    ]);

    expect(result.map((area) => area.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps ties stable with created_at and id", () => {
    const result = sortAreasForDisplay([
      buildArea({ id: "b", name: "Alpha", type: "Personal", created_at: "2026-01-02T00:00:00.000Z" }),
      buildArea({ id: "a", name: "Alpha", type: "Personal", created_at: "2026-01-01T00:00:00.000Z" }),
    ]);

    expect(result.map((area) => area.id)).toEqual(["a", "b"]);
  });
});
