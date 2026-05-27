import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { areaService } from "@/lib/services/area.service";
import { goalService } from "@/lib/services/goal.service";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { taskService } from "@/lib/services/task.service";
import { resourceService } from "@/lib/services/resource.service";
import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { getAreaRollups } from "@/lib/utils/areas";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import { noteMatchesAreaId } from "@/lib/utils/notes";
import { mergeProjectQueryResults, projectMatchesAreaId } from "@/lib/utils/projects";
import { taskMatchesAreaId } from "@/lib/utils/tasks";

export const AREA_DETAIL_QUERY_KEY = "area-detail";

export interface AreaDetailData {
  area: Area;
  goals: Goal[];
  /** All goals for the user, used for cross-area goal name lookup. */
  allGoals: Goal[];
  projects: Project[];
  tasks: Task[];
  /** Tasks where is_archived = true that are linked to this area. */
  archivedTasks: Task[];
  notes: Note[];
  resources: Resource[];
  allTasks: Task[];
  allNotes: Note[];
  allResources: Resource[];
  /** Names for topics referenced by linked resources (resolves topic bubbles). */
  topicNames: { id: string; name: string }[];
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

      const [
        goalsResult,
        activeProjectsResult,
        archivedProjectsResult,
        tasksResult,
        archivedTasksResult,
        allNotesResult,
        activeResourcesResult,
        archivedResourcesResult,
      ] = await Promise.all([
        goalService.list(userId, { status: "all" }),
        projectService.list(userId, { status: "all" }),
        projectService.list(userId, { status: "archived" }),
        taskService.list(userId),
        taskService.listArchived(userId),
        noteService.list(userId, { status: "all", includeArchived: true }),
        resourceService.list(userId, { status: "all" }),
        resourceService.listArchived(userId),
      ]);

      const projectsResult = mergeProjectQueryResults(activeProjectsResult, archivedProjectsResult);
      const allResourcesResult = [...activeResourcesResult, ...archivedResourcesResult].filter(
        (resource, index, list) => list.findIndex((candidate) => candidate.id === resource.id) === index,
      );

      // Filter every collection junction-aware so cards, tabs, and rollups all
      // agree on what counts as "linked to this area" — matches goal-card,
      // project-card, and area-card semantics elsewhere in the app.
      const linkedGoals = goalsResult.filter((g) => goalMatchesAreaId(g, areaId));
      const linkedProjects = projectsResult.filter((p) => projectMatchesAreaId(p, areaId));
      const linkedTasks = tasksResult.filter((t) => taskMatchesAreaId(t, areaId));
      const linkedArchivedTasks = archivedTasksResult.filter((t) => taskMatchesAreaId(t, areaId));
      const linkedNotes = allNotesResult.filter((n) => noteMatchesAreaId(n, areaId));
      const linkedResources = allResourcesResult.filter((r) => {
        const ids = r.linkedAreaIds && r.linkedAreaIds.length > 0
          ? r.linkedAreaIds
          : r.area_id
            ? [r.area_id]
            : [];
        return ids.includes(areaId);
      });

      // Compute rollups via the shared helper so the area-detail header,
      // areas-list page, and contact-detail area cards always show the same
      // numbers for the same area.
      const sharedRollups = getAreaRollups({
        areaId,
        goals: goalsResult,
        projects: projectsResult,
        tasks: tasksResult,
        notes: allNotesResult,
        resources: allResourcesResult,
      });

      // Resolve topic names for linked resources so topic bubbles stay rendered
      // on refetch identically to the SSR prefetch payload.
      const topicIdSet = new Set<string>();
      for (const resource of allResourcesResult) {
        const topicId = (resource as { topic_id?: string | null }).topic_id;
        if (topicId) topicIdSet.add(topicId);
      }
      const topicNames =
        topicIdSet.size > 0
          ? await createClient()
              .from("topics")
              .select("id, name")
              .eq("user_id", userId)
              .in("id", [...topicIdSet])
              .then(({ data }) =>
                (data ?? []).map((t) => ({ id: t.id as string, name: t.name as string })),
              )
          : [];

      return {
        area,
        goals: linkedGoals,
        allGoals: goalsResult,
        projects: linkedProjects,
        tasks: linkedTasks,
        archivedTasks: linkedArchivedTasks,
        notes: linkedNotes,
        resources: linkedResources,
        allTasks: tasksResult,
        allNotes: allNotesResult,
        allResources: allResourcesResult,
        topicNames,
        rollups: {
          goalCount: sharedRollups.goalsCount,
          projectCount: sharedRollups.projectsCount,
          taskCount: sharedRollups.tasksCount,
          noteCount: sharedRollups.notesCount,
          resourceCount: sharedRollups.resourcesCount,
        },
      };
    },
    enabled: !!user && !!areaIdentifier,
    // Force refetch on every mount so detail cards always show freshly
    // hydrated correlation rollups + progress, regardless of the global
    // staleTime applied to the cached prefetch payload.
    refetchOnMount: "always",
    staleTime: 0,
  });
}
