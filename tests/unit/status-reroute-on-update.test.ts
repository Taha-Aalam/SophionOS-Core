/**
 * Regression tests for status re-derivation when context is cleared via update.
 *
 * Six user-reported bugs, all sharing the pattern "status stays at the
 * non-inbox bucket after the context that earned it was removed":
 *
 *  1. Project status=planning, no area or goal links → should be inbox
 *  2. Project status=planning, no start_date or due_date → should be inbox
 *  3. Task status=todo, no area/goal/project links → should be inbox
 *  4. Task status=todo, no due_date → should be inbox
 *  5. Note status=to_review, no area/goal/project/topic links → should be inbox
 *  6. Resource status=to_review, no area/goal/project/topic links → should be inbox
 *
 * These tests exercise the service-layer re-derivation logic directly. They
 * assert that when the caller sends a stale status alongside context changes
 * that would produce a different bucket, the service overrides the caller
 * status with the re-derived value.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectService } from "../../src/lib/services/project.service";
import { taskService } from "../../src/lib/services/task.service";
import { noteService } from "../../src/lib/services/note.service";
import { resourceService } from "../../src/lib/services/resource.service";
import { createClient } from "../../src/lib/supabase/client";
import {
  NOTE_STATUS,
  PROJECT_STATUS,
  RESOURCE_STATUS,
  TASK_STATUS,
} from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

/**
 * Build a single shared client. The `query` method is a smart builder
 * that returns a chain-aware object whose `eq().eq().maybeSingle()` /
 * `select().single()` / `in()` resolve to caller-controlled stubs. Any
 * chain step not in the stub list defaults to a chainable pass-through
 * (returns the same builder).
 */
function makeClient() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: any = {
    from: vi.fn((table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    }),
    insert: vi.fn((payload: unknown) => {
      calls.push({ method: "insert", args: [payload] });
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      calls.push({ method: "update", args: [payload] });
      return builder;
    }),
    delete: vi.fn(() => {
      calls.push({ method: "delete", args: [] });
      return builder;
    }),
    select: vi.fn((cols?: string) => {
      calls.push({ method: "select", args: [cols] });
      return builder;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ method: "eq", args: [col, val] });
      return builder;
    }),
    in: vi.fn((col: string, vals: unknown) => {
      calls.push({ method: "in", args: [col, vals] });
      return builder;
    }),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(() => {
      calls.push({ method: "single", args: [] });
      return Promise.resolve({ data: null, error: null });
    }),
    maybeSingle: vi.fn(() => {
      calls.push({ method: "maybeSingle", args: [] });
      return Promise.resolve({ data: null, error: null });
    }),
  };
  (builder as any)._calls = calls;
  (builder as any)._setTerminal = (
    method: "single" | "maybeSingle",
    data: any,
  ) => {
    builder[method].mockImplementation(() => {
      calls.push({ method, args: [] });
      return Promise.resolve({ data, error: null });
    });
  };
  return builder;
}

const userId = "user-123";
const projectId = "project-123";
const taskId = "task-123";
const noteId = "note-123";
const resourceId = "resource-123";

// Realistic shape: a row whose stored status is the bucket the user is
// about to clear. The bug is "row stays on the stale bucket after the
// context that earned it was removed" — so the row must START on the
// stale bucket for the regression to reproduce.
const fullProjectRow = {
  id: projectId,
  name: "Test Project",
  status: PROJECT_STATUS.PLANNING,
  slug: "test-project",
  user_id: userId,
};

const fullTaskRow = {
  id: taskId,
  name: "Test Task",
  status: TASK_STATUS.TODO,
  user_id: userId,
  area_id: null,
  project_id: null,
  is_completed: false,
  previous_status: null,
  completed_at: null,
  due_date: null,
};

const fullNoteRow = {
  id: noteId,
  name: "Test Note",
  status: NOTE_STATUS.TO_REVIEW,
  slug: "test-note",
  user_id: userId,
  type: null,
};

const fullResourceRow = {
  id: resourceId,
  name: "Test Resource",
  status: RESOURCE_STATUS.TO_REVIEW,
  user_id: userId,
  url: null,
  type: "website",
  project_id: null,
  topic_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("status re-routing on update", () => {
  // ─── PROJECT BUGS ─────────────────────────────────────────────────────

  it("project: flips status to inbox when start_date and due_date are cleared", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullProjectRow);

    await projectService.update(userId, projectId, {
      name: fullProjectRow.name,
      start_date: null,
      due_date: null,
      status: PROJECT_STATUS.PLANNING,
    });

    // Find the update call that targets the projects row — it must carry inbox
    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    const projectsUpdate = updateCalls.find((c: any) => {
      const payload = c.args[0] as Record<string, unknown>;
      return payload && Object.prototype.hasOwnProperty.call(payload, "status");
    });
    expect(projectsUpdate).toBeDefined();
    expect((projectsUpdate!.args[0] as any).status).toBe(PROJECT_STATUS.INBOX);
  });

  it("project: flips status to inbox when all area + goal links are removed", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullProjectRow);
    client._setTerminal("maybeSingle", {
      status: PROJECT_STATUS.PLANNING,
      start_date: null,
      due_date: null,
      area_id: null,
    });

    await projectService.update(userId, projectId, {
      name: fullProjectRow.name,
      goal_ids: [],
      area_ids: [],
      status: PROJECT_STATUS.PLANNING,
    });

    // The 1st update call (row update) must re-derive to INBOX
    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    const firstUpdate = updateCalls[0];
    expect(firstUpdate).toBeDefined();
    expect((firstUpdate.args[0] as any).status).toBe(PROJECT_STATUS.INBOX);
  });

  // ─── TASK BUGS ────────────────────────────────────────────────────────

  it("task: flips status to inbox when due_date is cleared and no context", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullTaskRow);

    await taskService.update(userId, taskId, {
      due_date: null,
      status: TASK_STATUS.TODO,
    });

    // touchesCompletion fires getById (1st .single()), then row update (2nd .single())
    const singleCalls = client._calls.filter((c: any) => c.method === "single");
    expect(singleCalls.length).toBeGreaterThanOrEqual(1);
    // The 2nd update is the row update; its payload should carry inbox
    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    // Find the update that has a status field
    const rowUpdate = updateCalls.find(
      (c: any) => (c.args[0] as any).status !== undefined,
    );
    expect(rowUpdate).toBeDefined();
    expect((rowUpdate!.args[0] as any).status).toBe(TASK_STATUS.INBOX);
  });

  it("task: flips status to inbox when all area + goal + project links are removed", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullTaskRow);
    client._setTerminal("maybeSingle", {
      status: TASK_STATUS.TODO,
      area_id: null,
      project_id: null,
    });

    await taskService.update(userId, taskId, {
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      status: TASK_STATUS.TODO,
    });

    // 1st update is the row update — must carry INBOX
    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    const firstUpdate = updateCalls[0];
    expect(firstUpdate).toBeDefined();
    expect((firstUpdate.args[0] as any).status).toBe(TASK_STATUS.INBOX);
  });

  // ─── NOTE BUGS ────────────────────────────────────────────────────────

  it("note: flips status to inbox when all area/goal/project/topic links are removed", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullNoteRow);

    await noteService.update(userId, noteId, {
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      task_ids: [],
      topic_id: null,
      status: NOTE_STATUS.TO_REVIEW,
    });

    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    const firstUpdate = updateCalls[0];
    expect(firstUpdate).toBeDefined();
    expect((firstUpdate.args[0] as any).status).toBe(NOTE_STATUS.INBOX);
  });

  // ─── RESOURCE BUGS ────────────────────────────────────────────────────

  it("resource: flips status to inbox when all area/goal/project/topic links are removed", async () => {
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    client._setTerminal("single", fullResourceRow);

    await resourceService.update(userId, resourceId, {
      area_ids: [],
      goal_ids: [],
      task_ids: [],
      project_id: null,
      topic_id: null,
      status: RESOURCE_STATUS.TO_REVIEW,
    });

    const updateCalls = client._calls.filter((c: any) => c.method === "update");
    const firstUpdate = updateCalls[0];
    expect(firstUpdate).toBeDefined();
    expect((firstUpdate.args[0] as any).status).toBe(RESOURCE_STATUS.INBOX);
  });
});
