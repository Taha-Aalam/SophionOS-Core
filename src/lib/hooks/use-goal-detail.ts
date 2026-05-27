import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
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
  /** Names for goals linked to notes/resources but not the current goal */
  extraGoalNames: { id: string; name: string }[];
  /** Names for tasks linked to notes/resources but not already in `tasks` */
  extraTaskNames: { id: string; name: string }[];
  /** Names for topics referenced by linked resources (resolves topic bubbles) */
  topicNames: { id: string; name: string }[];
}

interface GoalDetailFilters {
  projectStatus?: string;
  taskStatus?: string;
}

export function useGoalDetail(goalId: string, filters?: GoalDetailFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [GOAL_DETAIL_QUERY_KEY, "v2", goalId, filters],
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

      // Collect goal/task IDs referenced by notes/resources that aren't already known
      const knownGoalIds = new Set([goal.id]);
      const knownTaskIds = new Set(tasksResult.map((t) => t.id));
      const extraGoalIdSet = new Set<string>();
      const extraTaskIdSet = new Set<string>();
      const topicIdSet = new Set<string>();

      for (const item of [...notes, ...resources]) {
        for (const id of (item as { linkedGoalIds?: string[] }).linkedGoalIds ?? []) {
          if (!knownGoalIds.has(id)) extraGoalIdSet.add(id);
        }
        for (const id of (item as { linkedTaskIds?: string[] }).linkedTaskIds ?? []) {
          if (!knownTaskIds.has(id)) extraTaskIdSet.add(id);
        }
      }
      for (const resource of resources) {
        const topicId = (resource as { topic_id?: string | null }).topic_id;
        if (topicId) topicIdSet.add(topicId);
      }

      const supabase = createClient();
      const [extraGoalNames, extraTaskNames, topicNames] = await Promise.all([
        extraGoalIdSet.size > 0
          ? supabase
              .from("goals")
              .select("id, name")
              .eq("user_id", userId)
              .in("id", [...extraGoalIdSet])
              .then(({ data }) => (data ?? []).map((g) => ({ id: g.id as string, name: g.name as string })))
          : Promise.resolve<{ id: string; name: string }[]>([]),
        extraTaskIdSet.size > 0
          ? supabase
              .from("tasks")
              .select("id, name")
              .eq("user_id", userId)
              .in("id", [...extraTaskIdSet])
              .then(({ data }) => (data ?? []).map((t) => ({ id: t.id as string, name: t.name as string })))
          : Promise.resolve<{ id: string; name: string }[]>([]),
        topicIdSet.size > 0
          ? supabase
              .from("topics")
              .select("id, name")
              .eq("user_id", userId)
              .in("id", [...topicIdSet])
              .then(({ data }) => (data ?? []).map((t) => ({ id: t.id as string, name: t.name as string })))
          : Promise.resolve<{ id: string; name: string }[]>([]),
      ]);

      return {
        goal,
        projects,
        tasks,
        notes,
        resources,
        extraGoalNames,
        extraTaskNames,
        topicNames,
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
    // Force refetch on every mount so detail cards always show freshly
    // hydrated correlation rollups + progress, regardless of the global
    // staleTime applied to the cached prefetch payload.
    refetchOnMount: "always",
    staleTime: 0,
  });
}
