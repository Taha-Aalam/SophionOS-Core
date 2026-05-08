import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { areaService } from "@/lib/services/area.service";
import { goalService } from "@/lib/services/goal.service";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { taskService } from "@/lib/services/task.service";
import type { Area, Goal, Note, Project, Task } from "@/lib/types/domain.types";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import { projectMatchesAreaId } from "@/lib/utils/projects";
import { taskMatchesAreaId } from "@/lib/utils/tasks";
import { noteMatchesAreaId } from "@/lib/utils/notes";

export const AREA_DETAIL_QUERY_KEY = "area-detail";

export interface AreaDetailData {
  area: Area;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  rollups: {
    goalCount: number;
    projectCount: number;
    taskCount: number;
    noteCount: number;
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

      const [goalsResult, projectsResult, tasksResult, notesResult] = await Promise.all([
        goalService.list(userId, { status: "all" }),
        projectService.list(userId, { status: "all" }),
        taskService.list(userId),
        noteService.list(userId),
      ]);

      const linkedGoals = goalsResult.filter((g) => goalMatchesAreaId(g, areaId));
      const linkedProjects = projectsResult.filter((p) => projectMatchesAreaId(p, areaId));
      const linkedTasks = tasksResult.filter((t) => taskMatchesAreaId(t, areaId));
      const linkedNotes = notesResult.filter((n) => noteMatchesAreaId(n, areaId));

      return {
        area,
        goals: linkedGoals,
        projects: linkedProjects,
        tasks: linkedTasks,
        notes: linkedNotes,
        rollups: {
          goalCount: linkedGoals.length,
          projectCount: linkedProjects.length,
          taskCount: linkedTasks.length,
          noteCount: linkedNotes.length,
        },
      };
    },
    enabled: !!user && !!areaIdentifier,
  });
}