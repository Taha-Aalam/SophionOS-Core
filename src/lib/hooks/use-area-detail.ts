import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { areaService } from "@/lib/services/area.service";
import { goalService } from "@/lib/services/goal.service";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { taskService } from "@/lib/services/task.service";
import { resourceService } from "@/lib/services/resource.service";
import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import { projectMatchesAreaId } from "@/lib/utils/projects";
import { taskMatchesAreaId } from "@/lib/utils/tasks";

export const AREA_DETAIL_QUERY_KEY = "area-detail";

const ACTIVE_NOTE_STATUSES: Set<string> = new Set([NOTE_STATUS.INBOX, NOTE_STATUS.TO_REVIEW, NOTE_STATUS.ACTIVE]);
const ACTIVE_RESOURCE_STATUSES: Set<string> = new Set([RESOURCE_STATUS.INBOX, RESOURCE_STATUS.TO_REVIEW, RESOURCE_STATUS.ACTIVE]);

export interface AreaDetailData {
  area: Area;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  rollups: {
    goalCount: number;
    projectCount: number;
    taskCount: number;
    noteCount: number;
    resourceCount: number;
  };
}

export function useAreaDetail(areaIdentifier: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AREA_DETAIL_QUERY_KEY, areaIdentifier],
    queryFn: async (): Promise<AreaDetailData> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const userId = user.id;

      const area = await areaService.getByIdentifier(userId, areaIdentifier);
      
      const areaId = area.id;

      const [goalsResult, projectsResult, tasksResult, notesResult, resourcesResult] = await Promise.all([
        goalService.list(userId, { status: "all" }),
        projectService.list(userId, { status: "all" }),
        taskService.list(userId),
        noteService.listByArea(userId, areaId),
        resourceService.listByArea(userId, areaId),
      ]);

      const linkedGoals = goalsResult.filter((g) => goalMatchesAreaId(g, areaId));
      const linkedProjects = projectsResult.filter((p) => projectMatchesAreaId(p, areaId));
      const linkedTasks = tasksResult.filter((t) => taskMatchesAreaId(t, areaId));
      const linkedNotes = notesResult;

      return {
        area,
        goals: linkedGoals,
        projects: linkedProjects,
        tasks: linkedTasks,
        notes: linkedNotes,
        resources: resourcesResult,
        rollups: {
          goalCount: linkedGoals.filter((g) => !g.is_archived && !g.is_completed).length,
          projectCount: linkedProjects.filter((p) => !p.is_archived && p.status !== "completed").length,
          taskCount: linkedTasks.filter((t) => !t.is_archived && !t.is_completed).length,
          noteCount: linkedNotes.filter(
            (n) =>
              !n.is_archived &&
              ACTIVE_NOTE_STATUSES.has(n.status),
          ).length,
          resourceCount: resourcesResult.filter(
            (r) =>
              !r.is_archived &&
              ACTIVE_RESOURCE_STATUSES.has(r.status),
          ).length,
        },
      };
    },
    enabled: !!user && !!areaIdentifier,
    refetchOnMount: true,
  });
}