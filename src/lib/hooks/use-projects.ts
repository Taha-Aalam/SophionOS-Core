import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { projectService } from "@/lib/services/project.service";
import { entityLimitToastMessage } from "@/lib/entity-limit";
import {
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from "@/lib/types/domain.types";

import { type ProjectStatus } from "../utils/constants";

export const PROJECTS_QUERY_KEY = "projects";

function invalidateProjectGraph(queryClient: ReturnType<typeof useQueryClient>): Promise<unknown[]> {
  // Derived-progress list caches (areas/goals) need refetchType: "all" because the
  // global query-provider sets refetchOnMount: false — without it, invalidated-but-inactive
  // queries stay stale until manual refresh when the user navigates back. This is what
  // moves a goal between "inactive" and "active" tabs after linking work.
  //
  // The same refetchType applies to PROJECTS_QUERY_KEY itself: the project detail
  // page reads useProject(slug) / useProjectWithRelations(id), and after an edit
  // those caches need to refetch immediately so the title, badges, and properties
  // panel reflect the new values without a manual page refresh.
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: ["goal-detail"] }),
  ]);
}

export function useProjects(
  filters: {
    term?: string;
    priority?: string;
    areaId?: string;
    status?: ProjectStatus | "all";
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, filters],
    queryFn: () => projectService.list(user!.id, filters),
    enabled: !!user && (options?.enabled ?? true),
  });
}

export function useProject(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, id],
    queryFn: () => projectService.getByIdentifier(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useProjectsByStatus(userId: string | undefined, status: ProjectStatus | "all") {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, "byStatus", userId, status],
    queryFn: () => projectService.listByStatus(userId!, status),
    enabled: !!userId,
  });
}

export function useProjectsByArea(userId: string | undefined, areaId: string) {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, "byArea", userId, areaId],
    queryFn: () => projectService.listByArea(userId!, areaId),
    enabled: !!userId && !!areaId,
  });
}

export function useProjectWithRelations(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, "relations", id],
    queryFn: () => projectService.getWithRelations(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(user!.id, input),
    onSuccess: async () => {
      await invalidateProjectGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      toast.success("Project created successfully");
    },
    onError: (error: Error) => {
      toast.error(entityLimitToastMessage(error, "Failed to create project"));
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectService.update(user!.id, id, input),
    onSuccess: async () => {
      await invalidateProjectGraph(queryClient);
      toast.success("Project updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update project");
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => projectService.delete(user!.id, id),
    onSuccess: async () => {
      await invalidateProjectGraph(queryClient);
      toast.success("Project deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
}

// Find a project by id across every cached projects list.
function findProjectInCaches(
  caches: [readonly unknown[], Project[] | undefined][],
  id: string,
): Project | undefined {
  for (const [, data] of caches) {
    if (Array.isArray(data)) {
      const found = data.find((project) => project.id === id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

// Upsert a project into a specific status-scoped list cache so an archived /
// restored project appears in its destination tab immediately, before the
// settle-time refetch arrives.
function upsertIntoStatusCache(
  queryClient: ReturnType<typeof useQueryClient>,
  status: "all" | "archived",
  project: Project,
): void {
  queryClient.setQueryData<Project[]>([PROJECTS_QUERY_KEY, { status }], (current) => {
    if (!Array.isArray(current)) {
      return [project];
    }
    if (current.some((p) => p.id === project.id)) {
      return current.map((p) => (p.id === project.id ? project : p));
    }
    return [project, ...current];
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => projectService.archive(user!.id, id),
    // Optimistic move: flip is_archived in every list cache (so the All tab's
    // `!is_archived` filter drops it) and seed the archived-status cache so the
    // Archive tab shows it without waiting for the refetch.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      const previous = queryClient.getQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] });
      const target = findProjectInCaches(previous, id);

      queryClient.setQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] }, (current) => {
        if (!Array.isArray(current)) {
          return current;
        }
        return current.map((p) => (p.id === id ? { ...p, is_archived: true } : p));
      });

      if (target) {
        upsertIntoStatusCache(queryClient, "archived", { ...target, is_archived: true });
      }

      return { previous };
    },
    onError: (error: Error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message || "Failed to archive project");
    },
    onSuccess: () => {
      toast.success("Project archived");
    },
    onSettled: async () => {
      await invalidateProjectGraph(queryClient);
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => projectService.restore(user!.id, id),
    // Mirror of useArchiveProject: clear is_archived everywhere (so the Archive
    // tab's `is_archived` filter drops it) and seed the active-status cache so
    // the All tab shows it immediately.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      const previous = queryClient.getQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] });
      const target = findProjectInCaches(previous, id);

      queryClient.setQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] }, (current) => {
        if (!Array.isArray(current)) {
          return current;
        }
        return current.map((p) => (p.id === id ? { ...p, is_archived: false } : p));
      });

      if (target) {
        upsertIntoStatusCache(queryClient, "all", { ...target, is_archived: false });
      }

      return { previous };
    },
    onError: (error: Error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message || "Failed to restore project");
    },
    onSuccess: () => {
      toast.success("Project restored");
    },
    onSettled: async () => {
      await invalidateProjectGraph(queryClient);
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      projectService.update(user!.id, id, { status }),
    onMutate: async ({ id, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
        queryClient.cancelQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
        queryClient.cancelQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
      ]);
      const previousProjects = queryClient.getQueriesData<Project[]>({
        queryKey: [PROJECTS_QUERY_KEY],
      });
      const previousProject = queryClient.getQueryData<Project>([PROJECTS_QUERY_KEY, id]);
      const previousAreaDetails = queryClient.getQueriesData<{ projects?: Project[] }>({
        queryKey: [AREA_DETAIL_QUERY_KEY],
      });
      const previousGoalDetails = queryClient.getQueriesData<{ projects?: Project[] }>({
        queryKey: [GOAL_DETAIL_QUERY_KEY],
      });

      queryClient.setQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] }, (current) => {
        if (!Array.isArray(current)) {
          return current;
        }

        return current.map((project) => (project.id === id ? { ...project, status } : project));
      });
      queryClient.setQueryData<Project>([PROJECTS_QUERY_KEY, id], (current) =>
        current ? { ...current, status } : current,
      );
      queryClient.setQueriesData<{ projects?: Project[] }>(
        { queryKey: [AREA_DETAIL_QUERY_KEY] },
        (current) => {
          if (!current || !Array.isArray(current.projects)) {
            return current;
          }
          return {
            ...current,
            projects: current.projects.map((project) =>
              project.id === id ? { ...project, status } : project,
            ),
          };
        },
      );
      queryClient.setQueriesData<{ projects?: Project[] }>(
        { queryKey: [GOAL_DETAIL_QUERY_KEY] },
        (current) => {
          if (!current || !Array.isArray(current.projects)) {
            return current;
          }
          return {
            ...current,
            projects: current.projects.map((project) =>
              project.id === id ? { ...project, status } : project,
            ),
          };
        },
      );

      return {
        previousProject,
        previousProjects,
        previousAreaDetails,
        previousGoalDetails,
      };
    },
    onError: (error: Error, variables, context) => {
      context?.previousProjects.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousAreaDetails.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousGoalDetails.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData([PROJECTS_QUERY_KEY, variables.id], context?.previousProject);
      toast.error(error.message || "Failed to update project status");
    },
    onSettled: async () => {
      await invalidateProjectGraph(queryClient);
    },
  });
}

export function useLinkProjectToGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ projectId, goalId }: { projectId: string; goalId: string }) =>
      projectService.linkToGoal(user!.id, projectId, goalId),
    onSuccess: async () => {
      await invalidateProjectGraph(queryClient);
      toast.success("Project linked to goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link project to goal");
    },
  });
}

export function useUnlinkProjectFromGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ projectId, goalId }: { projectId: string; goalId: string }) =>
      projectService.unlinkFromGoal(user!.id, projectId, goalId),
    onSuccess: async () => {
      await invalidateProjectGraph(queryClient);
      toast.success("Project unlinked from goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink project from goal");
    },
  });
}

export function useLinkProjectToArea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ projectId, areaId }: { projectId: string; areaId: string }) =>
      projectService.linkToArea(user!.id, projectId, areaId),
    onSuccess: async (_, variables) => {
      await invalidateProjectGraph(queryClient);
      await queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY, variables.projectId] });
      toast.success("Area linked to project");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link area to project");
    },
  });
}

export function useUnlinkProjectFromArea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ projectId, areaId }: { projectId: string; areaId: string }) =>
      projectService.unlinkFromArea(user!.id, projectId, areaId),
    onSuccess: async (_, variables) => {
      await invalidateProjectGraph(queryClient);
      await queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY, variables.projectId] });
      toast.success("Area unlinked from project");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink area from project");
    },
  });
}

export function useProjectsByGoal(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, "byGoal", user?.id ?? null, goalId],
    queryFn: () => projectService.listByGoal(user!.id, goalId),
    enabled: !!user && !!goalId,
  });
}
