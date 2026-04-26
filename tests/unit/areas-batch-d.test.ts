import { describe, expect, it } from "vitest";

import {
  classifyAreaStatus,
  groupAreasByType,
  normalizeAreaType,
} from "@/lib/utils/areas";
import type { Area } from "@/lib/types/domain.types";

function createArea(overrides: Partial<Area>): Area {
  return {
    archive: false,
    color: null,
    created_at: new Date().toISOString(),
    description: null,
    icon: null,
    id: crypto.randomUUID(),
    inactive: false,
    metadata: {},
    name: "Area",
    slug: "area",
    type: "Personal",
    updated_at: new Date().toISOString(),
    user_id: "user-1",
    ...overrides,
  };
}

describe("areas Batch D helpers", () => {
  it("normalizes stored and display area types into a single canonical title case", () => {
    expect(normalizeAreaType("business")).toBe("Business");
    expect(normalizeAreaType("  sTuDiEs ")).toBe("Studies");
    expect(normalizeAreaType("")).toBe("Personal");
    expect(normalizeAreaType(null)).toBe("Personal");
  });

  it("groups non-archived areas by normalized type and preserves inactive areas in the type view", () => {
    const groupedAreas = groupAreasByType([
      createArea({ id: "1", name: "Work", type: "business" }),
      createArea({ id: "2", name: "Health", type: "Personal", inactive: true }),
      createArea({ id: "3", name: "Study Plan", type: " studies " }),
      createArea({ id: "4", name: "Hidden", type: "Business", archive: true }),
    ]);

    expect(groupedAreas).toEqual([
      {
        type: "Business",
        areas: [expect.objectContaining({ id: "1", name: "Work" })],
      },
      {
        type: "Personal",
        areas: [expect.objectContaining({ id: "2", name: "Health", inactive: true })],
      },
      {
        type: "Studies",
        areas: [expect.objectContaining({ id: "3", name: "Study Plan" })],
      },
    ]);
  });

  it("keeps archived areas separate from inactive areas so restore returns to the correct tab", () => {
    expect(classifyAreaStatus(createArea({ archive: false, inactive: false }))).toBe("active");
    expect(classifyAreaStatus(createArea({ archive: false, inactive: true }))).toBe("inactive");
    expect(classifyAreaStatus(createArea({ archive: true, inactive: false }))).toBe("archived");
    expect(classifyAreaStatus(createArea({ archive: true, inactive: true }))).toBe("archived");
  });

  it("moves an area between grouped sections after a type edit", () => {
    const area = createArea({ id: "area-1", name: "Career", type: "Personal" });

    const beforeEdit = groupAreasByType([area]);
    const afterEdit = groupAreasByType([{ ...area, type: "Business" }]);

    expect(beforeEdit).toEqual([
      {
        type: "Personal",
        areas: [expect.objectContaining({ id: "area-1" })],
      },
    ]);
    expect(afterEdit).toEqual([
      {
        type: "Business",
        areas: [expect.objectContaining({ id: "area-1" })],
      },
    ]);
  });
});
