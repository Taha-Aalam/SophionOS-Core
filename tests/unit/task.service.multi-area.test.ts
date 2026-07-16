/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { taskService } from "../../src/lib/services/task.service";
import { createClient } from "../../src/lib/supabase/client";

vi.mock("../../src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

/** Mock PostgREST builder that supports assertOwnedIds (.select.eq.in on id). */
function makeDefaultClient(): any {
  const client: any = {
    from: vi.fn(function (this: any) {
      return this;
    }),
    select: vi.fn(function (this: any) {
      return this;
    }),
    insert: vi.fn(function (this: any) {
      return this;
    }),
    update: vi.fn(function (this: any) {
      return this;
    }),
    delete: vi.fn(function (this: any) {
      return this;
    }),
    eq: vi.fn(function (this: any) {
      return this;
    }),
    in: vi.fn(function (this: any, column: string, ids?: string[]) {
      if (column === "id" && Array.isArray(ids)) {
        return Promise.resolve({ data: ids.map((id) => ({ id })), error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    order: vi.fn(function (this: any) {
      return this;
    }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // Terminal chains that end on .eq() (e.g. getAreaLinks) can be awaited.
  client.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject);
  return client;
}

/** Client used as replace*Links `sb`: ownership check + junction insert. */
function makeOwnershipAndInsertClient(): any {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn((column: string, ids: string[]) => {
      if (column === "id" && Array.isArray(ids)) {
        return Promise.resolve({ data: ids.map((id) => ({ id })), error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
}

/** getAreaLinks / getGoalLinks terminal .eq() lookup. */
function makeLinkLookupClient(rows: unknown[] = []): any {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

const userId = "user-123";
const taskId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const areaA = "11111111-1111-4111-8111-111111111111";
const areaB = "22222222-2222-4222-8222-222222222222";
const areaC = "33333333-3333-4333-8333-333333333333";

function makeTaskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: taskId,
    user_id: userId,
    area_id: areaA,
    project_id: null,
    name: "Test Task",
    description: null,
    status: "inbox",
    priority: "medium",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    completed_at: null,
    smart_priority: 0,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockReset();
});

describe("taskService – multi-area create", () => {
  it("persists all selected area IDs via task_areas on create", async () => {
    const taskRow = makeTaskRow({ area_id: areaA });

    const taskInsertClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: taskRow, error: null }),
    } as any;

    // replaceAreaLinks: one client for assertOwnedIds + junction insert
    const areaSb = makeOwnershipAndInsertClient();
    // getAreaLinks (separate createClient)
    const areaLinksClient = makeLinkLookupClient([]);

    vi.mocked(createClient)
      .mockImplementationOnce(() => taskInsertClient)
      .mockImplementationOnce(() => areaSb)
      .mockImplementationOnce(() => areaLinksClient)
      .mockImplementation(() => makeDefaultClient());

    const result = await taskService.create(userId, {
      name: "Test Task",
      area_ids: [areaA, areaB],
    } as any);

    expect(result).toBeDefined();
    expect(taskInsertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ area_id: areaA, user_id: userId }),
    );
    expect(areaSb.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { task_id: taskId, area_id: areaA },
        { task_id: taskId, area_id: areaB },
      ]),
    );
  });

  it("deduplicates area IDs before writing to task_areas", async () => {
    const taskRow = makeTaskRow({ area_id: areaA });

    const taskInsertClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: taskRow, error: null }),
    } as any;

    const areaSb = makeOwnershipAndInsertClient();
    const areaLinksClient = makeLinkLookupClient([]);

    vi.mocked(createClient)
      .mockImplementationOnce(() => taskInsertClient)
      .mockImplementationOnce(() => areaSb)
      .mockImplementationOnce(() => areaLinksClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Test Task",
      area_ids: [areaA, areaA, areaB],
    } as any);

    const insertCall = areaSb.insert.mock.calls[0][0];
    const insertedAreaIds = insertCall.map((r: any) => r.area_id);
    const unique = new Set(insertedAreaIds);
    expect(unique.size).toBe(insertedAreaIds.length);
  });

  it("sets area_id to first area_ids entry on the task row", async () => {
    const taskRow = makeTaskRow({ area_id: areaA });

    const taskInsertClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: taskRow, error: null }),
    } as any;

    const areaSb = makeOwnershipAndInsertClient();
    const areaLinksClient = makeLinkLookupClient([]);

    vi.mocked(createClient)
      .mockImplementationOnce(() => taskInsertClient)
      .mockImplementationOnce(() => areaSb)
      .mockImplementationOnce(() => areaLinksClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.create(userId, {
      name: "Test Task",
      area_ids: [areaA, areaB],
    } as any);

    expect(taskInsertClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ area_id: areaA }),
    );
  });
});

describe("taskService – multi-area update", () => {
  it("replaces existing task_areas on update", async () => {
    const taskRow = makeTaskRow({ area_id: areaB });

    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: taskRow, error: null }),
    } as any;

    // replaceAreaLinks sb: ownership + insert of new links
    const areaSb = makeOwnershipAndInsertClient();
    // getAreaLinks — existing link areaA
    const areaLinksClient = makeLinkLookupClient([{ area_id: areaA }]);
    const areaDeleteClient = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => areaSb)
      .mockImplementationOnce(() => areaLinksClient)
      .mockImplementationOnce(() => areaDeleteClient)
      .mockImplementation(() => makeDefaultClient());

    await taskService.update(userId, taskId, {
      name: "Updated Task",
      area_ids: [areaB, areaC],
    } as any);

    expect(areaSb.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { task_id: taskId, area_id: areaB },
        { task_id: taskId, area_id: areaC },
      ]),
    );
    expect(areaDeleteClient.in).toHaveBeenCalledWith("area_id", [areaA]);
  });
});

describe("taskService – linkedAreaIds hydration", () => {
  it("hydrateTaskAreaLinks attaches linkedAreaIds from task_areas", async () => {
    const tasks = [makeTaskRow({ area_id: areaA }), makeTaskRow({ id: "other-task", area_id: null })];

    const areaQueryClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { task_id: taskId, area_id: areaA },
          { task_id: taskId, area_id: areaB },
        ],
        error: null,
      }),
    } as any;

    vi.mocked(createClient).mockImplementationOnce(() => areaQueryClient);

    const result = await (taskService as any).hydrateTaskAreaLinks(tasks);

    const primary = result.find((t: any) => t.id === taskId);
    expect(primary.linkedAreaIds).toEqual(expect.arrayContaining([areaA, areaB]));
    expect(primary.linkedAreaIds).toHaveLength(2);
  });

  it("falls back to [area_id] when task_areas table is unavailable", async () => {
    const tasks = [makeTaskRow({ area_id: areaA })];

    const failClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation task_areas does not exist" },
      }),
    } as any;

    vi.mocked(createClient).mockImplementationOnce(() => failClient);

    const result = await (taskService as any).hydrateTaskAreaLinks(tasks);
    const task = result[0];
    expect(task.linkedAreaIds).toEqual([areaA]);
  });

  it("returns empty linkedAreaIds when no area_id and task_areas is empty", async () => {
    const tasks = [makeTaskRow({ area_id: null })];

    const areaQueryClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    vi.mocked(createClient).mockImplementationOnce(() => areaQueryClient);

    const result = await (taskService as any).hydrateTaskAreaLinks(tasks);
    expect(result[0].linkedAreaIds).toEqual([]);
  });
});

describe("taskService – getWithRelations includes area_ids and project_ids", () => {
  it("returns area_ids from task_areas and project_ids from task_projects", async () => {
    const goalResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ goal_id: "g1" }], error: null }),
    } as any;

    const areaResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ area_id: areaA }, { area_id: areaB }], error: null }),
    } as any;

    const projectResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ project_id: "p1" }, { project_id: "p2" }],
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => goalResultClient)
      .mockImplementationOnce(() => areaResultClient)
      .mockImplementationOnce(() => projectResultClient);

    const result = await taskService.getWithRelations(userId, taskId);

    expect(result.goal_ids).toEqual(["g1"]);
    expect(result.area_ids).toEqual(expect.arrayContaining([areaA, areaB]));
    expect(result.project_ids).toEqual(expect.arrayContaining(["p1", "p2"]));
  });

  it("falls back gracefully when task_areas table is missing", async () => {
    const goalResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    const areaResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation task_areas does not exist" },
      }),
    } as any;

    const projectResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => goalResultClient)
      .mockImplementationOnce(() => areaResultClient)
      .mockImplementationOnce(() => projectResultClient);

    const result = await taskService.getWithRelations(userId, taskId);

    expect(result.area_ids).toEqual([]);
    expect(result.project_ids).toEqual([]);
  });

  it("falls back gracefully when task_projects table is missing", async () => {
    const goalResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    const areaResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    const projectResultClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation task_projects does not exist" },
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => goalResultClient)
      .mockImplementationOnce(() => areaResultClient)
      .mockImplementationOnce(() => projectResultClient);

    const result = await taskService.getWithRelations(userId, taskId);

    expect(result.project_ids).toEqual([]);
  });
});
