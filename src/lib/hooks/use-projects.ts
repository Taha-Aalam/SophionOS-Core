import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { projectService } from "@/lib/services/project.service";
import {
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from "@/lib/types/domain.types";

import { type ProjectStatus } from "../utils/constants";

export const PROJECTS_QUERY_KEY = "projects";

function invalidateProjectGraph(queryClient: ReturnType<typeof useQueryClient>): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
  ]);
}

export function useProjects(filters: {
  term?: string;
  priority?: string;
  areaId?: string;
  status?: ProjectStatus | "all";
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, filters],
    queryFn: () => projectService.list(user!.id, filters),
    enabled: !!user,
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
      toast.error(error.message || "Failed to create project");
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

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      projectService.update(user!.id, id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      const previousProjects = queryClient.getQueriesData<Project[]>({
        queryKey: [PROJECTS_QUERY_KEY],
      });
      const previousProject = queryClient.getQueryData<Project>([PROJECTS_QUERY_KEY, id]);

      queryClient.setQueriesData<Project[]>({ queryKey: [PROJECTS_QUERY_KEY] }, (current) => {
        if (!Array.isArray(current)) {
          return current;
        }

        return current.map((project) => (project.id === id ? { ...project, status } : project));
      });
      queryClient.setQueryData<Project>([PROJECTS_QUERY_KEY, id], (current) =>
        current ? { ...current, status } : current,
      );

      return {
        previousProject,
        previousProjects,
      };
    },
    onError: (error: Error, variables, context) => {
      context?.previousProjects.forEach(([queryKey, data]) => {
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
