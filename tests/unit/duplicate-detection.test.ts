import { describe, expect, it } from "vitest";

function buildDuplicateIndices(goals: { id: string; name: string; created_at: string }[]) {
  const result = new Map<string, number>();
  const grouped = new Map<string, { id: string; name: string; created_at: string }[]>();

  for (const goal of goals) {
    if (!grouped.has(goal.name)) {
      grouped.set(goal.name, []);
    }
    grouped.get(goal.name)!.push(goal);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;

    const byCreationOrder = [...group].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );

    byCreationOrder.forEach((goal, index) => {
      result.set(goal.id, index + 1);
    });
  }

  return result;
}

describe("duplicate goal badge indexing", () => {
  it("does not flag a single numeric title as a duplicate", () => {
    const indices = buildDuplicateIndices([
      { id: "goal-1", name: "Test 4", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "goal-2", name: "Other", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    expect(indices.has("goal-1")).toBe(false);
  });

  it("assigns occurrence indices per goal record, not per shared name key", () => {
    const indices = buildDuplicateIndices([
      { id: "goal-1", name: "Test Goal Name", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "goal-2", name: "Test Goal Name", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "goal-3", name: "Test Goal Name", created_at: "2026-04-27T12:00:00.000Z" },
    ]);

    expect(indices.get("goal-1")).toBe(1);
    expect(indices.get("goal-2")).toBe(2);
    expect(indices.get("goal-3")).toBe(3);
  });

  it("lets the first duplicate occurrence render without a copy badge", () => {
    const indices = buildDuplicateIndices([
      { id: "goal-1", name: "Alpha", created_at: "2026-04-27T10:00:00.000Z" },
      { id: "goal-2", name: "Alpha", created_at: "2026-04-27T11:00:00.000Z" },
    ]);

    const shouldShowBadge = (duplicateIndex: number | undefined) =>
      duplicateIndex != null && duplicateIndex > 1;

    expect(shouldShowBadge(indices.get("goal-1"))).toBe(false);
    expect(shouldShowBadge(indices.get("goal-2"))).toBe(true);
  });

  it("keeps the original item as copy 1 even if the list is displayed newest-first", () => {
    const indices = buildDuplicateIndices([
      { id: "newer", name: "Test Goal Name", created_at: "2026-04-27T11:00:00.000Z" },
      { id: "older", name: "Test Goal Name", created_at: "2026-04-27T10:00:00.000Z" },
    ]);

    expect(indices.get("older")).toBe(1);
    expect(indices.get("newer")).toBe(2);
  });
});
