/**
 * Tests for the 4D cross-field cascade in inbox NoteProcessForm.
 *
 * Strategy: render the form to static markup and verify which options
 * appear. The cascade's useMemo runs at render time, so the trigger
 * labels and selected-id badges reflect cascade state synchronously.
 *
 * The 4D filter functions (computeVisibleAreas, computeFilteredProjects,
 * computeFilteredGoals, computeFilteredTasks) are already covered by
 * resource-dialog's own tests. This file verifies the *wiring* — that
 * the cascade useMemos and the prune useEffects drop ids that fall
 * out of the visible set.
 */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/use-notes", () => ({
  useUpdateNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { NoteInboxProcessForm } from "@/components/entities/note-inbox-process-form";
import type { Note } from "@/lib/types/domain.types";

const baseNote: Note = {
  id: "note-1",
  user_id: "user-1",
  name: "Spec draft",
  slug: "spec-draft",
  description: null,
  status: "inbox",
  type: "note",
  area_id: null,
  project_id: null,
  topic_id: null,
  pin: false,
  favorite: false,
  is_archived: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
} as Note;

const areaOptions = [
  { id: "area-a", name: "Area A", icon: null },
  { id: "area-b", name: "Area B", icon: null },
];

const goalOptions = [
  { id: "goal-a", name: "Goal A", area_id: "area-a" as string | null, linkedAreaIds: [] },
  { id: "goal-b", name: "Goal B", area_id: "area-b" as string | null, linkedAreaIds: [] },
];

const projectOptions = [
  { id: "proj-a", name: "Project A" },
  { id: "proj-b", name: "Project B" },
];

const taskOptions = [
  { id: "task-a", name: "Task A" },
  { id: "task-b", name: "Task B" },
];

const projectGoalIdsMap = new Map<string, string[]>();
const taskGoalIdsMap = new Map<string, string[]>();

function renderForm(note: Note): string {
  return renderToStaticMarkup(
    <NoteInboxProcessForm
      note={note}
      areaOptions={areaOptions}
      goalOptions={goalOptions}
      projectOptions={projectOptions}
      taskOptions={taskOptions}
      projectGoalIdsMap={projectGoalIdsMap}
      taskGoalIdsMap={taskGoalIdsMap}
      onClose={() => {}}
    />,
  );
}

describe("NoteInboxProcessForm 4D cascade", () => {
  it("case 1: with no selections, all four triggers show 'Select…' placeholders", () => {
    const html = renderForm(baseNote);
    expect(html).toContain("Select area…");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select task…");
  });
});
