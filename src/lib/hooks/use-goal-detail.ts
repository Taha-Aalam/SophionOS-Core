import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { goalService } from "@/lib/services/goal.service";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { resourceService } from "@/lib/services/resource.service";
import { taskService } from "@/lib/services/task.service";
import type { Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";

export const GOAL_DETAIL_QUERY_KEY = "goal-detail";

export interface GoalDetailData {
  goal: Goal;
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  rollups: {
    projectCount: number;
    taskCount: number;
    completedTaskCount: number;
    noteCount: number;
    resourceCount: number;
    activeProjectCount: number;
    activeTaskCount: number;
    activeNoteCount: number;
    activeResourceCount: number;
  };
}

interface GoalDetailFilters {
  projectStatus?: string;
  taskStatus?: string;
}

export function useGoalDetail(goalId: string, filters?: GoalDetailFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [GOAL_DETAIL_QUERY_KEY, goalId, filters],
    queryFn: async (): Promise<GoalDetailData> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const userId = user.id;

      // Parallel fetches for goal + all linked entities
      const goal = await goalService.getByIdentifier(userId, goalId);

      const [projectsResult, tasksResult, notesResult, resourcesResult] =
        await Promise.all([
          projectService.listByGoal(userId, goal.id),
          taskService.listByGoal(userId, goal.id),
          noteService.listByGoal(userId, goal.id),
          resourceService.listByGoal(userId, goal.id),
        ]);

      let projects = projectsResult;
      let tasks = tasksResult;
      const notes = notesResult;
      const resources = resourcesResult;

      // Apply status filters if provided
      if (filters?.projectStatus && filters.projectStatus !== "all") {
        if (filters.projectStatus === "archived") {
          projects = projects.filter((p) => p.is_archived);
        } else {
          projects = projects.filter(
            (p) => !p.is_archived && p.status === filters.projectStatus,
          );
        }
      }

      if (filters?.taskStatus && filters.taskStatus !== "all") {
        switch (filters.taskStatus) {
          case "inbox":
            tasks = tasks.filter((t) => t.status === "inbox" && !t.is_completed);
            break;
          case "upcoming":
            tasks = tasks.filter(
              (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
            );
            break;
          case "overdue":
            tasks = tasks.filter((t) => {
              if (!t.due_date || t.is_completed) return false;
              return new Date(t.due_date) < new Date();
            });
            break;
          case "completed":
            tasks = tasks.filter((t) => t.is_completed);
            break;
          default:
            // Other statuses passed through
            if (filters.taskStatus !== "all") {
              tasks = tasks.filter((t) => t.status === filters.taskStatus);
            }
        }
      }

      const completedTaskCount = tasksResult.filter((t) => t.is_completed).length;

      return {
        goal,
        projects,
        tasks,
        notes,
        resources,
        rollups: {
          projectCount: projectsResult.length,
          taskCount: tasksResult.length,
          completedTaskCount,
          noteCount: notesResult.length,
          resourceCount: resourcesResult.length,
          activeProjectCount: projectsResult.filter(
            (p) => !p.is_archived && p.status !== "completed",
          ).length,
          activeTaskCount: tasksResult.filter((t) => !t.is_archived && !t.is_completed).length,
          activeNoteCount: notesResult.filter(
            (n) => !n.is_archived && n.status !== "archive" && n.status !== "saved",
          ).length,
          activeResourceCount: resourcesResult.filter(
            (r) => !r.is_archived && r.status !== "saved",
          ).length,
        },
      };
    },
    enabled: !!user && !!goalId,
    refetchOnMount: true,
  });
}
