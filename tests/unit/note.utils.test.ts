import { describe, expect, it } from "vitest";

import {
  getNoteCounts,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
  getVisibleNotes,
  NOTE_VIEW,
  noteMatchesProjectId,
} from "../../src/lib/utils/notes";
import type { Note } from "../../src/lib/types/domain.types";

function createNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString();

  return {
    id: "note-1",
    user_id: "user-1",
    area_id: null,
    project_id: null,
    topic_id: null,
    name: "Test note",
    slug: "test-note",
    content: null,
    type: "note",
    status: "inbox",
    notebook: null,
    favorite: false,
    pin: false,
    is_archived: false,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  } as Note;
}

describe("getNoteLinkedGoalIds", () => {
  it("prefers hydrated linkedGoalIds when present", () => {
    expect(
      getNoteLinkedGoalIds(createNote({ linkedGoalIds: ["goal-1", "goal-2"] })),
    ).toEqual(["goal-1", "goal-2"]);
  });

  it("falls back to legacy direct goal_ids when linkedGoalIds are absent", () => {
    expect(
      getNoteLinkedGoalIds(createNote({ goal_ids: ["goal-3"] } as unknown as Partial<Note>)),
    ).toEqual(["goal-3"]);
  });

  it("falls back to metadata goal arrays when needed", () => {
    expect(
      getNoteLinkedGoalIds(
        createNote({
          metadata: {
            goal_ids: ["goal-4", "goal-4", "goal-5"],
          },
        }),
      ),
    ).toEqual(["goal-4", "goal-5"]);
  });
});

describe("project note helpers", () => {
  it("prefers linkedProjectIds when present", () => {
    expect(
      getNoteLinkedProjectIds(
        createNote({
          project_id: "project-legacy",
          linkedProjectIds: ["project-1", "project-2"],
        }),
      ),
    ).toEqual(["project-1", "project-2"]);
  });

  it("falls back to project_id when linkedProjectIds are absent", () => {
    expect(
      getNoteLinkedProjectIds(createNote({ project_id: "project-3" })),
    ).toEqual(["project-3"]);
  });

  it("matches linked projects when filtering by project id", () => {
    expect(
      noteMatchesProjectId(
        createNote({
          project_id: "project-primary",
          linkedProjectIds: ["project-1", "project-2"],
        }),
        "project-2",
      ),
    ).toBe(true);
  });

  it("counts notes with linked projects in the by_project tab", () => {
    const notes = [
      createNote({ id: "1", linkedProjectIds: ["project-1"] }),
      createNote({ id: "2", project_id: "project-2" }),
      createNote({ id: "3", is_archived: true, linkedProjectIds: ["project-3"] }),
      createNote({ id: "4" }),
    ];

    expect(getNoteCounts(notes).by_project).toBe(2);
  });

  it("includes notes linked only through linkedProjectIds in the by_project view", () => {
    const visibleNotes = getVisibleNotes(
      [
        createNote({ id: "1", linkedProjectIds: ["project-1"] }),
        createNote({ id: "2", project_id: "project-2" }),
        createNote({ id: "3", is_archived: true, linkedProjectIds: ["project-3"] }),
        createNote({ id: "4" }),
      ],
      NOTE_VIEW.BY_PROJECT,
    );

    expect(visibleNotes.map((note) => note.id)).toEqual(["1", "2"]);
  });
});
