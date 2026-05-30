import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { contactService } from "@/lib/services/contact.service";
import { AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import type {
  CreateContactInput,
  CreateContactLogInput,
  UpdateContactInput,
} from "@/lib/types/domain.types";

export const CONTACTS_QUERY_KEY = "contacts";

export function useContacts(
  filters?: { group?: string; archive?: boolean },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, filters],
    queryFn: () => contactService.list(user!.id, filters),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useContact(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, id],
    queryFn: () => contactService.getById(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useContactProjectLinks(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, "projects"],
    queryFn: () => contactService.getProjectLinks(user!.id, contactId),
    enabled: !!user && !!contactId,
  });
}

export function useContactTaskLinks(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, "tasks"],
    queryFn: () => contactService.getTaskLinks(user!.id, contactId),
    enabled: !!user && !!contactId,
  });
}

export function useContactAreaLinks(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, "areas"],
    queryFn: () => contactService.getAreaLinks(user!.id, contactId),
    enabled: !!user && !!contactId,
  });
}

export function useContactGoalLinks(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, "goals"],
    queryFn: () => contactService.getGoalLinks(user!.id, contactId),
    enabled: !!user && !!contactId,
  });
}

export function useContactBySlug(slug: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "slug", slug],
    queryFn: () => contactService.getBySlug(user!.id, slug),
    enabled: !!user && !!slug,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useContactsByProject() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "by-project"],
    queryFn: () => contactService.getContactsGroupedByProject(user!.id),
    enabled: !!user,
  });
}

export function useContactsByArea() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "by-area"],
    queryFn: () => contactService.getContactsGroupedByArea(user!.id),
    enabled: !!user,
  });
}

export function useContactsByGoal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "by-goal"],
    queryFn: () => contactService.getContactsGroupedByGoal(user!.id),
    enabled: !!user,
  });
}

export function useContactLogs(contactId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, "logs"],
    queryFn: () => contactService.listLogs(user!.id, contactId),
    enabled: !!user && !!contactId,
  });
}

export function useCreateContactLog(contactId: string, slug?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactLogInput) =>
      contactService.createLog(user!.id, contactId, input),
    onSuccess: (log) => {
      // Optimistically patch last_interaction_at in all cached contact copies
      const patchContact = (old: unknown) => {
        if (!old) return old;
        return { ...(old as object), last_interaction_at: log.logged_at };
      };
      queryClient.setQueryData([CONTACTS_QUERY_KEY, "slug", slug], patchContact);
      queryClient.setQueryData([CONTACTS_QUERY_KEY, contactId], patchContact);

      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, contactId, "logs"] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY], refetchType: "all" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useContactByGoal(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "goal", goalId],
    queryFn: () => contactService.getByGoal(user!.id, goalId),
    enabled: !!user && !!goalId,
  });
}

export function useContactByArea(areaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "area", areaId],
    queryFn: () => contactService.getByArea(user!.id, areaId),
    enabled: !!user && !!areaId,
  });
}

export function useContactByProject(projectId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "project", projectId],
    queryFn: () => contactService.getByProject(user!.id, projectId),
    enabled: !!user && !!projectId,
  });
}

export function useCreateContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      contactService.create(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY], refetchType: "all" });
      toast.success("Contact created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContact(slug?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) =>
      contactService.update(user!.id, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY], refetchType: "all" });
      if (slug) {
        queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, "slug", slug] });
      }
      toast.success("Contact updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.delete(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      toast.success("Contact deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useToggleContactFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.toggleFavorite(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchiveContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      contactService.update(user!.id, id, { archive }),
    onSuccess: (_, { archive }) => {
      queryClient.removeQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      toast.success(archive ? "Contact archived" : "Contact unarchived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLogInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.logInteraction(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      toast.success("Interaction logged");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLinkContactToProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      projectId,
      roleInProject,
    }: {
      contactId: string;
      projectId: string;
      roleInProject?: string;
    }) =>
      contactService.linkToProject(user!.id, contactId, projectId, roleInProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkContactFromProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      projectId,
    }: {
      contactId: string;
      projectId: string;
    }) => contactService.unlinkFromProject(user!.id, contactId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLinkContactToTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      taskId,
      roleInTask,
    }: {
      contactId: string;
      taskId: string;
      roleInTask?: string;
    }) => contactService.linkToTask(user!.id, contactId, taskId, roleInTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkContactFromTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, taskId }: { contactId: string; taskId: string }) =>
      contactService.unlinkFromTask(user!.id, contactId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLinkContactToArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, areaId }: { contactId: string; areaId: string }) =>
      contactService.linkToArea(user!.id, contactId, areaId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, contactId, "areas"] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkContactFromArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, areaId }: { contactId: string; areaId: string }) =>
      contactService.unlinkFromArea(user!.id, contactId, areaId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, contactId, "areas"] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLinkContactToGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, goalId }: { contactId: string; goalId: string }) =>
      contactService.linkToGoal(user!.id, contactId, goalId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, contactId, "goals"] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkContactFromGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, goalId }: { contactId: string; goalId: string }) =>
      contactService.unlinkFromGoal(user!.id, contactId, goalId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, contactId, "goals"] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}