import { describe, expect, it } from "vitest";

function buildDuplicateIndices(areas: { id: string; name: string; created_at: string }[]) {
  const result = new Map<string, number>();
  const grouped = new Map<string, { id: string; name: string; created_at: string }[]>();

  for (const area of areas) {
    if (!grouped.has(area.name)) {
      grouped.set(area.name, []);
    }
    grouped.get(area.name)!.push(area);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;

    const byCreationOrder = [...group].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );

    byCreationOrder.forEach((area, index) => {
      result.set(area.id, index + 1);
    });
  }

  return result;
}

describe("duplicate area badge indexing", () => {
  it("does not flag a single numeric title as a duplicate", () => {
    const indices = buildDuplicateIndices([
      { id: "area-1", name: "Test 4", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "area-2", name: "Other", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    expect(indices.has("area-1")).toBe(false);
  });

  it("assigns occurrence indices per area record, not per shared name key", () => {
    const indices = buildDuplicateIndices([
      { id: "area-1", name: "Test Area Name", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "area-2", name: "Test Area Name", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "area-3", name: "Test Area Name", created_at: "2026-04-27T12:00:00.000Z" },
    ]);

    expect(indices.get("area-1")).toBe(1);
    expect(indices.get("area-2")).toBe(2);
    expect(indices.get("area-3")).toBe(3);
  });

  it("lets the first duplicate occurrence render without a copy badge", () => {
    const indices = buildDuplicateIndices([
      { id: "area-1", name: "Alpha", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "area-2", name: "Alpha", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    const shouldShowBadge = (duplicateIndex: number | undefined) =>
      duplicateIndex != null && duplicateIndex > 1;

    expect(shouldShowBadge(indices.get("area-1"))).toBe(false);
    expect(shouldShowBadge(indices.get("area-2"))).toBe(true);
  });

  it("keeps the original item as copy 1 even if the list is displayed newest-first", () => {
    const indices = buildDuplicateIndices([
      { id: "newer", name: "Test Area Name", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "older", name: "Test Area Name", created_at: "2026-04-27T10:00:00.000Z" },
    ]);

    expect(indices.get("older")).toBe(1);
    expect(indices.get("newer")).toBe(2);
  });
});
