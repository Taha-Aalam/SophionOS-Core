import { describe, expect, it } from "vitest";

function buildDuplicateIndices(projects: { id: string; name: string; created_at: string }[]) {
  const result = new Map<string, number>();
  const grouped = new Map<string, { id: string; name: string; created_at: string }[]>();

  for (const project of projects) {
    if (!grouped.has(project.name)) {
      grouped.set(project.name, []);
    }
    grouped.get(project.name)!.push(project);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;

    const byCreationOrder = [...group].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );

    byCreationOrder.forEach((project, index) => {
      result.set(project.id, index + 1);
    });
  }

  return result;
}

describe("duplicate project badge indexing", () => {
  it("does not flag a single numeric title as a duplicate", () => {
    const indices = buildDuplicateIndices([
      { id: "proj-1", name: "Test 4", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "proj-2", name: "Other", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    expect(indices.has("proj-1")).toBe(false);
  });

  it("assigns occurrence indices per project record, not per shared name key", () => {
    const indices = buildDuplicateIndices([
      { id: "proj-1", name: "Launch Website", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "proj-2", name: "Launch Website", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "proj-3", name: "Launch Website", created_at: "2026-04-27T12:00:00.000Z" },
    ]);

    expect(indices.get("proj-1")).toBe(1);
    expect(indices.get("proj-2")).toBe(2);
    expect(indices.get("proj-3")).toBe(3);
  });

  it("lets the first duplicate occurrence render without a copy badge", () => {
    const indices = buildDuplicateIndices([
      { id: "proj-1", name: "Marketing", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "proj-2", name: "Marketing", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    const shouldShowBadge = (duplicateIndex: number | undefined) =>
      duplicateIndex != null && duplicateIndex > 1;

    expect(shouldShowBadge(indices.get("proj-1"))).toBe(false);
    expect(shouldShowBadge(indices.get("proj-2"))).toBe(true);
  });

  it("keeps the original item as copy 1 even if the list is displayed newest-first", () => {
    const indices = buildDuplicateIndices([
      { id: "newer", name: "Launch Website", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "older", name: "Launch Website", created_at: "2026-04-27T10:00:00.000Z" },
    ]);

    expect(indices.get("older")).toBe(1);
    expect(indices.get("newer")).toBe(2);
  });
});