import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectService } from "../../src/lib/services/project.service";
import { createClient } from "../../src/lib/supabase/client";
import { PROJECT_STATUS } from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => {
  return {
    createClient: vi.fn(),
  };
});

describe("projectService", () => {
  const userId = "user-123";
  const projectId = "project-123";
  const goalA = "11111111-1111-4111-8111-111111111111";
  const goalB = "22222222-2222-4222-8222-222222222222";
  const goalC = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a project and links selected goals", async () => {
    const createdProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.PLANNING,
      user_id: userId,
    };

    const projectClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: createdProject, error: null }),
    };
    const linkClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(createClient)
      .mockImplementationOnce(() => projectClient as never)
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }) as never)
      .mockImplementationOnce(() => linkClient as never);

    const result = await projectService.create(userId, {
      name: "Restore Projects",
      goal_ids: [goalA, goalB],
    });

    expect(result).toEqual(createdProject);
    expect(projectClient.insert).toHaveBeenCalledWith({
      goal_ids: undefined,
      is_archived: false,
      name: "Restore Projects",
      priority: "medium",
      progress: 0,
      start_date: undefined,
      due_date: undefined,
      area_id: undefined,
      description: undefined,
      status: "planning",
      user_id: userId,
    });
    expect(linkClient.insert).toHaveBeenCalledWith([
      { goal_id: goalA, project_id: projectId },
      { goal_id: goalB, project_id: projectId },
    ]);
  });

  it("syncs goal links during update", async () => {
    const updatedProject = {
      id: projectId,
      name: "Restore Projects",
      status: PROJECT_STATUS.ACTIVE,
      user_id: userId,
    };

    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedProject, error: null }),
    };
    const relationsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ goal_id: goalA }, { goal_id: goalB }],
        error: null,
      }),
    };
    const linkClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const unlinkClient = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(createClient)
      .mockImplementationOnce(() => updateClient as never)
      .mockImplementationOnce(() => relationsClient as never)
      .mockImplementationOnce(() => linkClient as never)
      .mockImplementationOnce(() => unlinkClient as never);

    const result = await projectService.update(userId, projectId, {
      status: PROJECT_STATUS.ACTIVE,
      goal_ids: [goalB, goalC],
    });

    expect(result).toEqual(updatedProject);
    expect(updateClient.update).toHaveBeenCalledWith({ status: PROJECT_STATUS.ACTIVE });
    expect(linkClient.insert).toHaveBeenCalledWith([{ goal_id: goalC, project_id: projectId }]);
    expect(unlinkClient.in).toHaveBeenCalledWith("goal_id", [goalA]);
  });

  it("updates project status without requiring other fields", async () => {
    const updatedProject = {
      id: projectId,
      status: PROJECT_STATUS.ACTIVE,
      user_id: userId,
    };
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedProject, error: null }),
    };

    vi.mocked(createClient).mockImplementationOnce(() => updateClient as never);

    const result = await projectService.update(userId, projectId, {
      status: PROJECT_STATUS.ACTIVE,
    });

    expect(result).toEqual(updatedProject);
    expect(updateClient.update).toHaveBeenCalledWith({ status: PROJECT_STATUS.ACTIVE });
  });
});
