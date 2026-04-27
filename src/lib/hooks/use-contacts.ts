import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { contactService } from "@/lib/services/contact.service";
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/types/domain.types";

export const CONTACTS_QUERY_KEY = "contacts";

export function useContacts(filters?: { group?: string; archive?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, filters],
    queryFn: () => contactService.list(user!.id, filters),
    enabled: !!user,
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

export function useContactsByProject() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, "by-project"],
    queryFn: () => contactService.getContactsGroupedByProject(user!.id),
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      toast.success("Contact created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) =>
      contactService.update(user!.id, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
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