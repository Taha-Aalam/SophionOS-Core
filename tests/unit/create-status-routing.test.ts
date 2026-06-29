/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regression tests for: service.create() must always derive status from
 * context, never trust a caller-supplied status that contradicts the
 * derived value. Covers the 6 bugs reported where a contextless entity
 * (no area/goal/project/topic) was being persisted with a non-inbox
 * status because the dialog form defaults to "planning"/"todo"/"to_review"
 * and the service was respecting that default.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { noteService } from "../../src/lib/services/note.service";
import { projectService } from "../../src/lib/services/project.service";
import { resourceService } from "../../src/lib/services/resource.service";
import { taskService } from "../../src/lib/services/task.service";
import { createClient } from "../../src/lib/supabase/client";
import { NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, TASK_STATUS } from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

function makeDefaultClient(): any {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
}

const userId = "user-123";
const projectId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const noteId = "33333333-3333-4333-8333-333333333333";
const resourceId = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockReset();
});

describe("projectService.create status routing (bug #1, #2)", () => {
  it("persists inbox when caller passes status=planning with no area/goal/dates", async () => {
    const created = { id: projectId, name: "Loose ends", status: PROJECT_STATUS.INBOX, slug: "loose-ends", user_id: userId };

    const slugClient = makeDefaultClient();
    slugClient.ilike.mockResolvedValue({ data: [], error: null });

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    const areaLookupClient = makeDefaultClient();
    areaLookupClient.eq.mockResolvedValue({ data: [], error: null });
    const goalLookupClient = makeDefaultClient();
    goalLookupClient.eq.mockResolvedValue({ data: [], error: null });
    const areaJunctionClient = makeDefaultClient();
    areaJunctionClient.in.mockResolvedValue({ data: [], error: null });
    const goalJunctionClient = makeDefaultClient();
    goalJunctionClient.in.mockResolvedValue({ data: [], error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => slugClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementationOnce(() => makeDefaultClient())
      .mockImplementationOnce(() => makeDefaultClient())
      .mockImplementationOnce(() => makeDefaultClient())
      .mockImplementationOnce(() => areaJunctionClient)
      .mockImplementationOnce(() => goalJunctionClient);

    await projectService.create(userId, {
      name: "Loose ends",
      status: PROJECT_STATUS.PLANNING,
    } as any);

    // Status must be derived, not the caller-supplied "planning"
    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: PROJECT_STATUS.INBOX }),
    );
  });

  it("persists inbox when caller passes status=planning with area but no dates (bug #2)", async () => {
    const created = { id: projectId, name: "Marketing site", status: PROJECT_STATUS.INBOX, slug: "marketing-site", user_id: userId };

    const slugClient = makeDefaultClient();
    slugClient.ilike.mockResolvedValue({ data: [], error: null });

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    const areaA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    vi.mocked(createClient)
      .mockImplementationOnce(() => slugClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await projectService.create(userId, {
      name: "Marketing site",
      status: PROJECT_STATUS.PLANNING,
      area_id: areaA,
    } as any);

    // Has area but no dates => planning should be DOWNGRADED to inbox
    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: PROJECT_STATUS.INBOX }),
    );
  });
});

describe("taskService.create status routing (bug #3, #4, create manual-status)", () => {
  it("preserves caller's manual todo status even with no area/goal/project (create manual-status)", async () => {
    const created = {
      id: taskId, user_id: userId, area_id: null, project_id: null,
      name: "Tidy desk", status: TASK_STATUS.TODO, priority: "medium",
      is_completed: false, is_archived: false, is_focused: false, is_important: false, is_urgent: false,
      completed_at: null, previous_status: null, smart_priority: 0,
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Tidy desk",
      status: TASK_STATUS.TODO,
    } as any);

    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: TASK_STATUS.TODO }),
    );
  });

  it("preserves caller's manual in_progress status even with no area/goal/project (create manual-status)", async () => {
    const created = {
      id: taskId, user_id: userId, area_id: null, project_id: null,
      name: "Start report", status: TASK_STATUS.IN_PROGRESS, priority: "medium",
      is_completed: false, is_archived: false, is_focused: false, is_important: false, is_urgent: false,
      completed_at: null, previous_status: null, smart_priority: 0,
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Start report",
      status: TASK_STATUS.IN_PROGRESS,
    } as any);

    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: TASK_STATUS.IN_PROGRESS }),
    );
  });

  it("preserves caller's manual completed status even with no area/goal/project (create manual-status)", async () => {
    const created = {
      id: taskId, user_id: userId, area_id: null, project_id: null,
      name: "Done thing", status: TASK_STATUS.COMPLETED, priority: "medium",
      is_completed: true, is_archived: false, is_focused: false, is_important: false, is_urgent: false,
      completed_at: "2026-06-26", previous_status: null, smart_priority: 0,
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Done thing",
      status: TASK_STATUS.COMPLETED,
    } as any);

    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: TASK_STATUS.COMPLETED }),
    );
  });

  it("still derives inbox when caller passes status=inbox with no area/goal/project (bug #3)", async () => {
    const created = {
      id: taskId, user_id: userId, area_id: null, project_id: null,
      name: "Tidy desk", status: TASK_STATUS.INBOX, priority: "medium",
      is_completed: false, is_archived: false, is_focused: false, is_important: false, is_urgent: false,
      completed_at: null, previous_status: null, smart_priority: 0,
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Tidy desk",
      status: TASK_STATUS.INBOX,
    } as any);

    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: TASK_STATUS.INBOX }),
    );
  });

  it("persists todo when caller passes area_id with status=todo (positive control)", async () => {
    const areaA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const created = {
      id: taskId, user_id: userId, area_id: areaA, project_id: null,
      name: "Tidy desk", status: TASK_STATUS.TODO, priority: "medium",
      is_completed: false, is_archived: false, is_focused: false, is_important: false, is_urgent: false,
      completed_at: null, previous_status: null, smart_priority: 0,
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    const areaLookupClient = makeDefaultClient();
    areaLookupClient.eq.mockResolvedValue({ data: [], error: null });
    const areaInsertClient = makeDefaultClient();
    areaInsertClient.insert.mockResolvedValue({ error: null });

    const touchClient = makeDefaultClient();
    touchClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementationOnce(() => areaLookupClient)
      .mockImplementationOnce(() => areaInsertClient)
      .mockImplementation(() => touchClient);

    await taskService.create(userId, {
      name: "Tidy desk",
      status: TASK_STATUS.TODO,
      area_ids: [areaA],
      due_date: "2026-12-31",
    } as any);

    // Has area + due_date => todo is correct, derivation agrees with caller
    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: TASK_STATUS.TODO }),
    );
  });
});

describe("noteService.create status routing (bug #5)", () => {
  it("persists inbox when caller passes status=to_review with no area/goal/project/topic (bug #5)", async () => {
    const created = {
      id: noteId, user_id: userId, name: "Random thought",
      status: NOTE_STATUS.INBOX, slug: "random-thought", type: "note", favorite: false, pin: false,
      is_archived: false, content: null, metadata: null, created_at: "", updated_at: "",
    };

    // One client handles all calls: upsertNoteType, insert note, hydration.
    const client = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    await noteService.create(userId, {
      name: "Random thought",
      status: NOTE_STATUS.TO_REVIEW,
    } as any);

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: NOTE_STATUS.INBOX }),
    );
  });
});

describe("resourceService.create status routing (bug #6)", () => {
  it("persists inbox when caller passes status=to_review with no area/goal/project/topic (bug #6)", async () => {
    const created = {
      id: resourceId, user_id: userId, name: "Cool link",
      status: RESOURCE_STATUS.INBOX, type: "website", favorite: false,
      is_archived: false, metadata: null, url: "https://example.com", created_at: "", updated_at: "",
    };

    const insertClient = makeDefaultClient();
    insertClient.single.mockResolvedValue({ data: created, error: null });

    vi.mocked(createClient)
      .mockImplementationOnce(() => insertClient)
      .mockImplementation(() => makeDefaultClient());

    await resourceService.create(userId, {
      name: "Cool link",
      url: "https://example.com",
      status: RESOURCE_STATUS.TO_REVIEW,
    } as any);

    expect(insertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: RESOURCE_STATUS.INBOX }),
    );
  });
});
