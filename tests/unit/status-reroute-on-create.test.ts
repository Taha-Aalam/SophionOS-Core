/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Repro: create with caller-supplied stale status + empty context
 * should be persisted as INBOX, not the caller's bucket.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { projectService } from "../../src/lib/services/project.service";
import { taskService } from "../../src/lib/services/task.service";
import { noteService } from "../../src/lib/services/note.service";
import { resourceService } from "../../src/lib/services/resource.service";
import { createClient } from "../../src/lib/supabase/client";
import {
  NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, TASK_STATUS,
} from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => ({ createClient: vi.fn() }));

function makeClient() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: any = {
    from: vi.fn(() => builder),
    insert: vi.fn((p) => { calls.push({ method: "insert", args: [p] }); return builder; }),
    upsert: vi.fn((p) => { calls.push({ method: "upsert", args: [p] }); return builder; }),
    update: vi.fn((p) => { calls.push({ method: "update", args: [p] }); return builder; }),
    delete: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({
      data: {
        id: "x", name: "x", slug: "x", user_id: "u",
        status: "inbox", is_archived: false, is_completed: false,
        previous_status: null, completed_at: null, due_date: null,
        area_id: null, project_id: null, type: null, url: null, topic_id: null,
      },
      error: null,
    })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  (builder as any)._calls = calls;
  return builder;
}

beforeEach(() => vi.clearAllMocks());

describe("create should override stale status when context empty", () => {
  it("project: planning + no context → insert must carry INBOX", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await projectService.create("u", {
      name: "p",
      area_ids: [],
      goal_ids: [],
      start_date: null,
      due_date: null,
      status: PROJECT_STATUS.PLANNING,
      priority: "medium",
      progress: 0,
      is_archived: false,
      description: null,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(PROJECT_STATUS.INBOX);
  });

  it("task: todo + no context → preserves caller's manual todo (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await taskService.create("u", {
      name: "t",
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      due_date: null,
      status: TASK_STATUS.TODO,
      priority: "medium",
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      description: null,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect((ins!.args[0] as any).status).toBe(TASK_STATUS.TODO);
  });

  it("note: to_review + no context → insert must carry INBOX", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await noteService.create("u", {
      name: "n",
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      task_ids: [],
      topic_id: null,
      status: NOTE_STATUS.TO_REVIEW,
      type: "note",
      content: null,
      favorite: false,
      pin: false,
      is_archived: false,
      notebooks: [],
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(NOTE_STATUS.INBOX);
  });

  it("note: active + no context → preserves caller's manual active (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await noteService.create("u", {
      name: "n",
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      task_ids: [],
      topic_id: null,
      status: NOTE_STATUS.ACTIVE,
      type: "note",
      content: null,
      favorite: false,
      pin: false,
      is_archived: false,
      notebooks: [],
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(NOTE_STATUS.ACTIVE);
  });

  it("note: completed + no context → preserves caller's manual completed (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await noteService.create("u", {
      name: "n",
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      task_ids: [],
      topic_id: null,
      status: NOTE_STATUS.COMPLETED,
      type: "note",
      content: null,
      favorite: false,
      pin: false,
      is_archived: false,
      notebooks: [],
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(NOTE_STATUS.COMPLETED);
  });

  it("resource: to_review + no context → insert must carry INBOX", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await resourceService.create("u", {
      name: "r",
      url: null,
      type: "website",
      area_ids: [],
      goal_ids: [],
      task_ids: [],
      project_id: null,
      topic_id: null,
      status: RESOURCE_STATUS.TO_REVIEW,
      favorite: false,
      is_archived: false,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect((ins!.args[0] as any).status).toBe(RESOURCE_STATUS.INBOX);
  });

  it("resource: active + no context → preserves caller's manual active (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await resourceService.create("u", {
      name: "r",
      url: null,
      type: "website",
      area_ids: [],
      goal_ids: [],
      task_ids: [],
      project_id: null,
      topic_id: null,
      status: RESOURCE_STATUS.ACTIVE,
      favorite: false,
      is_archived: false,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(RESOURCE_STATUS.ACTIVE);
  });

  it("resource: completed + no context → preserves caller's manual completed (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await resourceService.create("u", {
      name: "r",
      url: null,
      type: "website",
      area_ids: [],
      goal_ids: [],
      task_ids: [],
      project_id: null,
      topic_id: null,
      status: RESOURCE_STATUS.COMPLETED,
      favorite: false,
      is_archived: false,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(RESOURCE_STATUS.COMPLETED);
  });

  // ─── TASK INBOX RULE: todo requires BOTH context AND due_date ──────────

  it("task: due_date only (no context) → preserves caller's manual todo (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await taskService.create("u", {
      name: "t",
      area_ids: [],
      goal_ids: [],
      project_ids: [],
      due_date: "2026-12-31",
      status: TASK_STATUS.TODO,
      priority: "medium",
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      description: null,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(TASK_STATUS.TODO);
  });

  it("task: project only (no due_date) → preserves caller's manual todo (create manual-status)", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await taskService.create("u", {
      name: "t",
      area_ids: [],
      goal_ids: [],
      project_ids: ["11111111-1111-4111-8111-111111111111"],
      due_date: null,
      status: TASK_STATUS.TODO,
      priority: "medium",
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      description: null,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(TASK_STATUS.TODO);
  });

  it("task: project + due_date → insert must carry TODO", async () => {
    const c = makeClient();
    vi.mocked(createClient).mockReturnValue(c as never);
    await taskService.create("u", {
      name: "t",
      area_ids: [],
      goal_ids: [],
      project_ids: ["11111111-1111-4111-8111-111111111111"],
      due_date: "2026-12-31",
      status: TASK_STATUS.INBOX,
      priority: "medium",
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      description: null,
    } as any);
    const ins = c._calls.find((x: any) => x.method === "insert");
    expect(ins).toBeDefined();
    expect((ins!.args[0] as any).status).toBe(TASK_STATUS.TODO);
  });
});
