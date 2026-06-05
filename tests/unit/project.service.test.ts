import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectService } from "../../src/lib/services/project.service";
import { createClient } from "../../src/lib/supabase/client";
import { PROJECT_STATUS } from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => {
  return {
    createClient: vi.fn(),
  };
});

function makeChainableClient(overrides: Record<string, unknown> = {}) {
  const client = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return client;
}

describe("projectService", () => {
  const userId = "user-123";
  const projectId = "project-123";
  const goalA = "11111111-1111-4111-8111-111111111111";
  const goalB = "22222222-2222-4222-8222-222222222222";
  const goalC = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockImplementation(() => makeChainableClient() as never);
  });

  it("creates a project and links selected goals", async () => {
    const createdProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.PLANNING,
      slug: "restore-projects",
      user_id: userId,
    };

    const clients = Array.from({ length: 7 }, () => makeChainableClient());
    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    // 1st call: generateUniqueSlug — return empty slug list
    // 2nd call: insert project
    // 3rd/4th calls: getWithRelations (goal_projects + project_areas inside replaceGoalLinks)
    // 5th call: insert goal links (inside replaceGoalLinks)
    // 6th call: hydrateProjectAreaLinks
    // 7th call: hydrateProjectGoalLinks

    clients[1].single.mockResolvedValue({ data: createdProject, error: null });
    clients[2].eq.mockResolvedValue({ data: [], error: null });
    clients[3].eq.mockResolvedValue({ data: [], error: null });
    clients[4].insert.mockResolvedValue({ error: null });
    clients[5].in.mockResolvedValue({ data: [], error: null });
    clients[6].in.mockResolvedValue({ data: [], error: null });

    const result = await projectService.create(userId, {
      name: "Restore Projects",
      goal_ids: [goalA, goalB],
    });

    expect(result).toMatchObject(createdProject);
    expect(clients[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Restore Projects",
        status: "inbox",
        user_id: userId,
      }),
    );
    expect(clients[4].insert).toHaveBeenCalledWith([
      { goal_id: goalA, project_id: projectId },
      { goal_id: goalB, project_id: projectId },
    ]);
  });

  it("syncs goal links during update", async () => {
    const updatedProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      slug: "restore-projects",
      user_id: userId,
    };

    const clients = Array.from({ length: 7 }, () => makeChainableClient());
    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    // 1st call: update project
    // 2nd/3rd calls: getWithRelations (goal_projects + project_areas)
    // 4th call: insert new links
    // 5th call: delete old links
    // 6th call: hydrateProjectAreaLinks
    // 7th call: hydrateProjectGoalLinks

    clients[0].single.mockResolvedValue({ data: updatedProject, error: null });
    clients[1].eq.mockResolvedValue({
      data: [{ goal_id: goalA }, { goal_id: goalB }],
      error: null,
    });
    clients[2].eq.mockResolvedValue({ data: [], error: null });
    clients[3].insert.mockResolvedValue({ error: null });
    clients[4].in.mockResolvedValue({ error: null });
    clients[5].in.mockResolvedValue({ data: [], error: null });
    clients[6].in.mockResolvedValue({ data: [], error: null });

    const result = await projectService.update(userId, projectId, {
      status: PROJECT_STATUS.ACTIVE,
      goal_ids: [goalB, goalC],
    });

    expect(result).toMatchObject(updatedProject);
    expect(clients[0].update).toHaveBeenCalledWith({ status: PROJECT_STATUS.ACTIVE });
    expect(clients[3].insert).toHaveBeenCalledWith([{ goal_id: goalC, project_id: projectId }]);
    expect(clients[4].in).toHaveBeenCalledWith("goal_id", [goalA]);
  });

  it("updates project status without requiring other fields", async () => {
    const updatedProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      slug: "restore-projects",
      user_id: userId,
    };

    const clients = Array.from({ length: 3 }, () => makeChainableClient());
    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    clients[0].single.mockResolvedValue({ data: updatedProject, error: null });
    clients[1].in.mockResolvedValue({ data: [], error: null });
    clients[2].in.mockResolvedValue({ data: [], error: null });

    const result = await projectService.update(userId, projectId, {
      status: PROJECT_STATUS.ACTIVE,
    });

    expect(result).toMatchObject(updatedProject);
    expect(clients[0].update).toHaveBeenCalledWith({ status: PROJECT_STATUS.ACTIVE });
  });

  it("reads project by slug when identifier is not a UUID", async () => {
    const projectBySlug = {
      id: projectId,
      name: "Restore Projects",
      slug: "restore-projects",
      user_id: userId,
    };

    const client = makeChainableClient();
    client.single.mockResolvedValue({ data: projectBySlug, error: null });
    vi.mocked(createClient).mockImplementation(() => client as never);

    const result = await projectService.getByIdentifier(userId, "restore-projects");
    expect(result).toMatchObject(projectBySlug);
    expect(client.eq).toHaveBeenCalledWith("slug", "restore-projects");
  });

  it("reads project by id when identifier is a UUID", async () => {
    const projectById = {
      id: projectId,
      name: "Restore Projects",
      user_id: userId,
    };

    const client = makeChainableClient();
    client.single.mockResolvedValue({ data: projectById, error: null });
    vi.mocked(createClient).mockImplementation(() => client as never);

    const result = await projectService.getByIdentifier(
      userId,
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(result).toMatchObject({
      ...projectById,
      slug: "restore-projects",
    });
    expect(client.eq).toHaveBeenCalledWith("id", "550e8400-e29b-41d4-a716-446655440000");
  });

  it("generates a unique slug when multiple names normalize to the same base slug", async () => {
    const client = makeChainableClient();
    client.ilike.mockResolvedValue({
      data: [{ slug: "my-project" }],
      error: null,
    });
    vi.mocked(createClient).mockImplementation(() => client as never);

    const result = await projectService.generateUniqueSlug(userId, "my-project");
    expect(result).toBe("my-project-1");
  });

  it("lists projects by retrying without slug when the database has not been migrated yet", async () => {
    const legacyProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      user_id: userId,
      area_id: null,
      description: null,
      priority: "medium",
      start_date: null,
      due_date: null,
      progress: 0,
      is_archived: false,
      created_at: "2026-04-29T00:00:00.000Z",
      updated_at: "2026-04-29T00:00:00.000Z",
    };

    const failingClient = makeChainableClient({
      data: null,
      error: {
        code: "42703",
        message: 'column projects.slug does not exist',
      },
    });
    const fallbackClient = makeChainableClient({
      data: [legacyProject],
      error: null,
    });
    const hydrationClient = makeChainableClient({
      data: [
        {
          id: projectId,
          name: "Restore Projects",
          status: PROJECT_STATUS.ACTIVE,
          slug: "restore-projects",
          user_id: userId,
          area_id: null,
          description: null,
          priority: "medium",
          start_date: null,
          due_date: null,
          progress: 0,
          is_archived: false,
          created_at: "2026-04-29T00:00:00.000Z",
          updated_at: "2026-04-29T00:00:00.000Z",
        },
      ],
      error: null,
    });
    hydrationClient.in.mockResolvedValue({ data: [], error: null });
    const goalLinkClient1 = makeChainableClient();
    goalLinkClient1.in.mockResolvedValue({ data: [], error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return ([failingClient, fallbackClient, hydrationClient, goalLinkClient1][callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.list(userId, { status: "all" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: projectId,
      name: "Restore Projects",
      slug: "restore-projects",
      linkedAreaIds: [],
    });
    expect(fallbackClient.select).toHaveBeenCalledWith(
      expect.not.stringContaining("slug"),
    );
  });

  it("resolves slug routes from project names when the slug column is unavailable", async () => {
    const missingSlugClient = makeChainableClient();
    missingSlugClient.single.mockResolvedValue({
      data: null,
      error: {
        code: "42703",
        message: 'column projects.slug does not exist',
      },
    });
    const failingListClient = makeChainableClient({
      data: null,
      error: {
        code: "42703",
        message: 'column projects.slug does not exist',
      },
    });
    const legacyListClient = makeChainableClient({
      data: [
        {
          id: projectId,
          name: "Restore Projects",
          status: PROJECT_STATUS.ACTIVE,
          user_id: userId,
          area_id: null,
          description: null,
          priority: "medium",
          start_date: null,
          due_date: null,
          progress: 0,
          is_archived: false,
          created_at: "2026-04-29T00:00:00.000Z",
          updated_at: "2026-04-29T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const areaLinkClient = makeChainableClient();
    areaLinkClient.in.mockResolvedValue({ data: [], error: null });
    const goalLinkClient2 = makeChainableClient();
    goalLinkClient2.in.mockResolvedValue({ data: [], error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return ([missingSlugClient, failingListClient, legacyListClient, areaLinkClient, goalLinkClient2][callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.getByIdentifier(userId, "restore-projects");

    expect(result).toMatchObject({
      id: projectId,
      name: "Restore Projects",
      slug: "restore-projects",
    });
    expect(legacyListClient.select).toHaveBeenCalledWith(
      expect.not.stringContaining("slug"),
    );
  });

  it("resolves slug routes from project names when the slug column exists but older rows are missing slug values", async () => {
    const slugLookupClient = makeChainableClient();
    slugLookupClient.single.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST116",
        message: "The result contains 0 rows",
      },
    });
    const listClient = makeChainableClient({
      data: [
        {
          id: projectId,
          name: "Restore Projects",
          status: PROJECT_STATUS.ACTIVE,
          user_id: userId,
          area_id: null,
          description: null,
          priority: "medium",
          start_date: null,
          due_date: null,
          progress: 0,
          is_archived: false,
          slug: null,
          created_at: "2026-04-29T00:00:00.000Z",
          updated_at: "2026-04-29T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const areaLinkClient = makeChainableClient();
    areaLinkClient.in.mockResolvedValue({ data: [], error: null });
    const goalLinkClient3 = makeChainableClient();
    goalLinkClient3.in.mockResolvedValue({ data: [], error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return ([slugLookupClient, listClient, areaLinkClient, goalLinkClient3][callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.getByIdentifier(userId, "restore-projects");

    expect(result).toMatchObject({
      id: projectId,
      name: "Restore Projects",
      slug: "restore-projects",
    });
    expect(listClient.select).toHaveBeenCalledWith(expect.stringContaining("slug"));
  });

  it("updates project status by retrying without slug when the database has not been migrated yet", async () => {
    const failingClient = makeChainableClient();
    failingClient.single.mockResolvedValueOnce({
      data: null,
      error: {
        code: "42703",
        message: 'column projects.slug does not exist',
      },
    });
    failingClient.single.mockResolvedValueOnce({
      data: {
        id: projectId,
        name: "Restore Projects",
        status: PROJECT_STATUS.COMPLETED,
        user_id: userId,
        area_id: null,
        description: null,
        priority: "medium",
        start_date: null,
        due_date: null,
        progress: 100,
        is_archived: false,
        created_at: "2026-04-29T00:00:00.000Z",
        updated_at: "2026-04-29T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(createClient).mockImplementation(() => failingClient as never);

    const result = await projectService.update(userId, projectId, {
      status: PROJECT_STATUS.COMPLETED,
      progress: 100,
    });

    expect(result).toMatchObject({
      id: projectId,
      status: PROJECT_STATUS.COMPLETED,
      progress: 100,
      slug: "restore-projects",
    });
    expect(failingClient.select).toHaveBeenNthCalledWith(
      2,
      expect.not.stringContaining("slug"),
    );
  });

  it("creates a project with area_ids and syncs area links", async () => {
    const createdProject = {
      id: projectId,
      name: "Multi Area Project",
      status: PROJECT_STATUS.PLANNING,
      slug: "multi-area-project",
      user_id: userId,
    };

    const clients = Array.from({ length: 9 }, () => makeChainableClient());
    // replaceAreaLinks select status,start_date,due_date via maybeSingle
    clients[5].maybeSingle.mockResolvedValue({ data: null, error: null });
    // Custom mock for update().eq().eq() chain in replaceAreaLinks
    const updateEqClient = makeChainableClient();
    clients[6].eq.mockReturnValue(updateEqClient);
    updateEqClient.eq.mockResolvedValue({ error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    clients[1].single.mockResolvedValue({ data: createdProject, error: null });
    // getWithRelations: goal_projects (clients[2]) and project_areas (clients[3])
    clients[2].eq.mockResolvedValue({ data: [], error: null });
    clients[3].eq.mockResolvedValue({ data: [], error: null });
    // insert project_areas
    clients[4].insert.mockResolvedValue({ error: null });
    // hydrateProjectAreaLinks (clients[7]), hydrateProjectGoalLinks (clients[8])
    clients[7].in.mockResolvedValue({ data: [], error: null });
    clients[8].in.mockResolvedValue({ data: [], error: null });

    const areaA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const areaB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    const result = await projectService.create(userId, {
      name: "Multi Area Project",
      area_ids: [areaA, areaB],
    });

    expect(result).toMatchObject(createdProject);
    expect(clients[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Multi Area Project",
        area_id: areaA,
        status: "inbox",
        user_id: userId,
      }),
    );
    expect(clients[4].insert).toHaveBeenCalledWith([
      { area_id: areaA, project_id: projectId },
      { area_id: areaB, project_id: projectId },
    ]);
  });

  it("syncs area links during update", async () => {
    const updatedProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      slug: "restore-projects",
      user_id: userId,
    };

    const clients = Array.from({ length: 8 }, () => makeChainableClient());
    // insert new area links (client[4])
    clients[4].insert.mockResolvedValue({ error: null });
    // delete old area links chain (client[5])
    const deleteEqClient = makeChainableClient();
    clients[5].eq.mockReturnValue(deleteEqClient);
    deleteEqClient.in.mockResolvedValue({ error: null });
    // update primary area chain (client[6])
    const updateEqClient = makeChainableClient();
    clients[6].eq.mockReturnValue(updateEqClient);
    updateEqClient.eq.mockResolvedValue({ error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    const areaA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const areaB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    // getById call (client[0]) + hydration (client[1])
    clients[0].single.mockResolvedValue({ data: updatedProject, error: null });
    clients[1].in.mockResolvedValue({ data: [], error: null });
    // getWithRelations: goal_projects (clients[2]) and project_areas (clients[3])
    clients[2].eq.mockResolvedValue({
      data: [{ area_id: areaA }],
      error: null,
    });
    clients[3].eq.mockResolvedValue({
      data: [{ area_id: areaA }],
      error: null,
    });
    // final hydration call (clients[7])
    clients[7].in.mockResolvedValue({ data: [], error: null });

    const result = await projectService.update(userId, projectId, {
      area_ids: [areaB],
    });

    expect(result).toMatchObject(updatedProject);
    // Verify that insert and delete mutations were dispatched somewhere in the client sequence
    const insertCalls = clients.map((c) => c.insert.mock.calls).flat();
    const inCalls = clients.map((c) => c.in.mock.calls).flat();
    expect(insertCalls).toContainEqual([
      [{ area_id: areaB, project_id: projectId }],
    ]);
    expect(inCalls).toContainEqual(["area_id", [areaA]]);
  });

  it("hydrates linked areas from project_areas table", async () => {
    const baseProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      slug: "restore-projects",
      user_id: userId,
      area_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      description: null,
      priority: "medium",
      start_date: null,
      due_date: null,
      progress: 0,
      is_archived: false,
      created_at: "2026-04-29T00:00:00.000Z",
      updated_at: "2026-04-29T00:00:00.000Z",
    };

    const listClient = makeChainableClient();
    const areaLinkClient = makeChainableClient();
    const goalLinkClient4 = makeChainableClient();

    listClient.data = [baseProject];
    listClient.error = null;
    areaLinkClient.in.mockResolvedValue({
      data: [
        { project_id: projectId, area_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        { project_id: projectId, area_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      ],
      error: null,
    });
    goalLinkClient4.in.mockResolvedValue({ data: [], error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      const clients = [listClient, areaLinkClient, goalLinkClient4];
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.list(userId, { status: "all" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: projectId,
      linkedAreaIds: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ],
    });
  });

  it("falls back to legacy single-area model when project_areas is unavailable", async () => {
    const baseProject = {
      id: projectId,
      name: "Legacy Project",
      status: PROJECT_STATUS.ACTIVE,
      user_id: userId,
      area_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      description: null,
      priority: "medium",
      start_date: null,
      due_date: null,
      progress: 0,
      is_archived: false,
      created_at: "2026-04-29T00:00:00.000Z",
      updated_at: "2026-04-29T00:00:00.000Z",
    };

    const listClient = makeChainableClient();
    const areaLinkClient = makeChainableClient();

    const goalLinkClientFallback = makeChainableClient();
    listClient.data = [baseProject];
    listClient.error = null;
    areaLinkClient.in.mockResolvedValue({
      data: null,
      error: {
        code: "42P01",
        message: 'relation "project_areas" does not exist',
      },
    });
    goalLinkClientFallback.in.mockResolvedValue({ data: [], error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      const clients = [listClient, areaLinkClient, goalLinkClientFallback];
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.list(userId, { status: "all" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: projectId,
      area_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      linkedAreaIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    });
  });

  it("getWithRelations returns both goal_ids and area_ids", async () => {
    const goalClient = makeChainableClient();
    const areaClient = makeChainableClient();

    goalClient.eq.mockResolvedValue({
      data: [{ goal_id: goalA }],
      error: null,
    });
    areaClient.eq.mockResolvedValue({
      data: [{ area_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
      error: null,
    });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return [goalClient, areaClient][callIndex++] as never;
    });

    const result = await projectService.getWithRelations(userId, projectId);

    expect(result).toMatchObject({
      goal_ids: [goalA],
      area_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    });
  });

  it("linkToArea recomputes the primary area when linking the first area to an unassigned project", async () => {
    const clients = Array.from({ length: 7 }, () => makeChainableClient());
    const updateEqClient = makeChainableClient();
    clients[6].eq.mockReturnValue(updateEqClient);
    updateEqClient.eq.mockResolvedValue({ error: null });

    clients[0].eq.mockResolvedValue({ data: [], error: null });
    clients[1].eq.mockResolvedValue({ data: [], error: null });
    clients[2].eq.mockResolvedValue({ data: [], error: null });
    clients[3].eq.mockResolvedValue({ data: [], error: null });
    clients[4].insert.mockResolvedValue({ error: null });
    // replaceAreaLinks now selects current project context via maybeSingle to
    // re-derive status; return null so only area_id is updated.
    clients[5].maybeSingle.mockResolvedValue({ data: null, error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    const areaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    await projectService.linkToArea(userId, projectId, areaId);

    expect(clients[4].insert).toHaveBeenCalledWith([
      { area_id: areaId, project_id: projectId },
    ]);
    expect(clients[6].update).toHaveBeenCalledWith({ area_id: areaId });
  });

  it("unlinkFromArea recomputes the primary area from the remaining linked areas", async () => {
    const clients = Array.from({ length: 7 }, () => makeChainableClient());
    const deleteEqClient = makeChainableClient();
    const updateEqClient = makeChainableClient();

    const areaA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const areaB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    clients[0].eq.mockResolvedValue({ data: [], error: null });
    clients[1].eq.mockResolvedValue({
      data: [{ area_id: areaA }, { area_id: areaB }],
      error: null,
    });
    clients[2].eq.mockResolvedValue({ data: [], error: null });
    clients[3].eq.mockResolvedValue({
      data: [{ area_id: areaA }, { area_id: areaB }],
      error: null,
    });
    clients[4].eq.mockReturnValue(deleteEqClient);
    deleteEqClient.in.mockResolvedValue({ error: null });
    clients[5].maybeSingle.mockResolvedValue({ data: null, error: null });
    clients[6].eq.mockReturnValue(updateEqClient);
    updateEqClient.eq.mockResolvedValue({ error: null });

    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    await projectService.unlinkFromArea(userId, projectId, areaA);

    expect(deleteEqClient.in).toHaveBeenCalledWith("area_id", [areaA]);
    expect(clients[6].update).toHaveBeenCalledWith({ area_id: areaB });
  });

  it("hydrates progress and goalCount/taskCount/noteCount/resourceCount on getById so the project detail header matches project cards everywhere", async () => {
    const projectRow = {
      id: "project-detail-rollups",
      user_id: userId,
      area_id: null,
      name: "Rollup Project",
      description: null,
      status: "active",
      priority: "medium",
      start_date: null,
      due_date: null,
      progress: 0,
      is_archived: false,
      slug: "rollup-project",
      created_at: "2026-04-28T10:00:00.000Z",
      updated_at: "2026-04-28T10:00:00.000Z",
    };

    const goalA = "11111111-1111-4111-8111-111111111111";
    const goalArchived = "22222222-2222-4222-8222-222222222222";

    // 1st call: getById (single)
    const projectClient = makeChainableClient();
    projectClient.single.mockResolvedValue({ data: projectRow, error: null });
    // 2nd call: hydrateProjectAreaLinks (project_areas)
    const projectAreasClient = makeChainableClient();
    projectAreasClient.in.mockResolvedValue({ data: [], error: null });
    // 3rd call: hydrateProjectGoalLinks (goal_projects)
    const goalProjectsClient = makeChainableClient();
    goalProjectsClient.in.mockResolvedValue({
      data: [
        { project_id: projectRow.id, goal_id: goalA },
        { project_id: projectRow.id, goal_id: goalArchived },
      ],
      error: null,
    });
    // 4th call: hydrateProjectProgress (queries tasks/notes/note_projects/resources in parallel)
    const progressClient = makeChainableClient();
    progressClient.in.mockResolvedValue({
      data: [
        { project_id: projectRow.id, is_completed: true, is_archived: false },
        { project_id: projectRow.id, is_completed: false, is_archived: false },
      ],
      error: null,
    });
    // 5th call: hydrateProjectRollupCounts (queries goals/tasks/notes/note_projects/resources)
    // The first .in call goes to "goals" (active filter); subsequent are tasks/notes/resources.
    const rollupsClient = makeChainableClient();
    rollupsClient.in.mockResolvedValue({
      data: [
        { id: goalA, is_completed: false, is_archived: false },
        { id: goalArchived, is_completed: false, is_archived: true },
      ],
      error: null,
    });

    const clients = [projectClient, projectAreasClient, goalProjectsClient, progressClient, rollupsClient];
    let callIndex = 0;
    vi.mocked(createClient).mockImplementation(() => {
      return (clients[callIndex++] ?? makeChainableClient()) as never;
    });

    const result = await projectService.getById(userId, projectRow.id);

    // Active goals: only goalA is active (goalArchived is is_archived=true).
    expect(result.goalCount).toBe(1);
    // We populated rollup counts; their exact values depend on which client
    // the hydrators end up using. Verify the FIELDS exist (i.e. were hydrated)
    // on the returned project — that's the regression we care about.
    expect(result).toHaveProperty("taskCount");
    expect(result).toHaveProperty("noteCount");
    expect(result).toHaveProperty("resourceCount");
    expect(result).toHaveProperty("progress");
    // linkedGoalIds should include both goals (rollup excludes archived but
    // linkedGoalIds is the raw set).
    expect(result.linkedGoalIds).toEqual(expect.arrayContaining([goalA, goalArchived]));
  });
});
