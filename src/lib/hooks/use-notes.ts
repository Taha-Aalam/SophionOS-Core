"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import { noteService } from "@/lib/services/note.service";
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/lib/types/domain.types";
import type { NoteStatus } from "@/lib/utils/constants";

export const NOTES_QUERY_KEY = "notes";

export function useNotes(
  filters?: {
    status?: NoteStatus | "all";
    favorite?: boolean;
    notebook?: string;
    areaId?: string;
    projectId?: string;
    includeArchived?: boolean;
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "list", user?.id ?? null, filters ?? {}],
    queryFn: () => noteService.list(user!.id, filters),
    enabled: !!user && (options?.enabled ?? true),
    refetchOnMount: true,
  });
}

export function useNote(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "detail", user?.id ?? null, id],
    queryFn: () => noteService.getById(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useNoteByIdentifier(identifier: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "detail", user?.id ?? null, identifier],
    queryFn: () => noteService.getByIdentifier(user!.id, identifier),
    enabled: !!user && !!identifier,
  });
}

export function useNotesByArea(areaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "byArea", user?.id ?? null, areaId],
    queryFn: () => noteService.listByArea(user!.id, areaId),
    enabled: !!user && !!areaId,
  });
}

export function useNotesByProject(projectId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "byProject", user?.id ?? null, projectId],
    queryFn: () => noteService.listByProject(user!.id, projectId),
    enabled: !!user && !!projectId,
    refetchOnMount: true,
  });
}

export function useNotebooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "notebooks", user?.id ?? null],
    queryFn: () => noteService.listNotebooks(user!.id),
    enabled: !!user,
  });
}

export function useNotesByGoal(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "byGoal", user?.id ?? null, goalId],
    queryFn: () => noteService.listByGoal(user!.id, goalId),
    enabled: !!user && !!goalId,
  });
}

export function useLinkNoteToGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, goalId }: { noteId: string; goalId: string }) =>
      noteService.linkToGoal(goalId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Note linked to goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link note to goal");
    },
  });
}

export function useTogglePinNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      noteService.update(user!.id, id, { pin }),
    onMutate: async ({ id, pin }) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });
      const previous = queryClient.getQueryData<Note>([
        NOTES_QUERY_KEY,
        "detail",
        user?.id ?? null,
        id,
      ]);
      queryClient.setQueriesData<Note[]>({ queryKey: [NOTES_QUERY_KEY, "list"] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((n) => (n.id === id ? { ...n, pin } : n));
      });
      queryClient.setQueryData<Note>(
        [NOTES_QUERY_KEY, "detail", user?.id ?? null, id],
        (current) => (current ? { ...current, pin } : current),
      );
      return { previous };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [NOTES_QUERY_KEY, "detail", user?.id ?? null, variables.id],
          context.previous,
        );
      }
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.error(error.message || "Failed to update pin");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
    },
  });
}

export function useUnlinkNoteFromGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, goalId }: { noteId: string; goalId: string }) =>
      noteService.unlinkFromGoal(goalId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Note unlinked from goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink note from goal");
    },
  });
}

export const NOTE_TYPES_QUERY_KEY = "note_types";

export function useNoteTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTE_TYPES_QUERY_KEY, user?.id ?? null],
    queryFn: () => noteService.listTypes(user!.id),
    enabled: !!user,
  });
}

function invalidateNoteGraph(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [NOTE_TYPES_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: ["goal-detail"] }),
  ]);
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => noteService.create(user!.id, input),
    onSuccess: async (note: Note) => {
      const projectIds = note.linkedProjectIds ?? [];
      for (const projectId of projectIds) {
        queryClient.setQueriesData<Note[]>(
          { queryKey: [NOTES_QUERY_KEY, "byProject", user?.id ?? null, projectId] },
          (current) => {
            if (!Array.isArray(current)) return [note];
            if (current.some((n) => n.id === note.id)) return current;
            return [note, ...current];
          },
        );
      }
      await invalidateNoteGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      toast.success("Note created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create note");
    },
  });
}

export function useCreateNoteWithGoal(goalId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      noteService.create(user!.id, { ...input, goal_ids: [goalId] }),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create note");
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      noteService.update(user!.id, id, input),
    onSuccess: async (updated: Note) => {
      queryClient.setQueryData(
        [NOTES_QUERY_KEY, "detail", user?.id ?? null, updated.id],
        updated,
      );
      if (updated.slug) {
        queryClient.setQueryData(
          [NOTES_QUERY_KEY, "detail", user?.id ?? null, updated.slug],
          updated,
        );
      }
      await invalidateNoteGraph(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save note");
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => noteService.archive(user!.id, id),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive note");
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => noteService.delete(user!.id, id),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete note");
    },
  });
}

export function useToggleFavoriteNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      noteService.update(user!.id, id, { favorite }),
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });
      const previous = queryClient.getQueryData<Note>([
        NOTES_QUERY_KEY,
        "detail",
        user?.id ?? null,
        id,
      ]);
      queryClient.setQueriesData<Note[]>({ queryKey: [NOTES_QUERY_KEY, "list"] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((n) => (n.id === id ? { ...n, favorite } : n));
      });
      queryClient.setQueryData<Note>(
        [NOTES_QUERY_KEY, "detail", user?.id ?? null, id],
        (current) => (current ? { ...current, favorite } : current),
      );
      return { previous };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [NOTES_QUERY_KEY, "detail", user?.id ?? null, variables.id],
          context.previous,
        );
      }
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.error(error.message || "Failed to update favorite");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
    },
  });
}

export function useNotesByNotebook(notebook: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "byNotebook", user?.id ?? null, notebook],
    queryFn: () => noteService.getByNotebook(user!.id, notebook),
    enabled: !!user && !!notebook,
  });
}

export function useRelatedNotes(noteId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "related", user?.id ?? null, noteId],
    queryFn: () => noteService.getRelated(user!.id, noteId),
    enabled: !!user && !!noteId,
  });
}

export function useLinkRelatedNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ noteAId, noteBId }: { noteAId: string; noteBId: string }) =>
      noteService.linkRelated(user!.id, noteAId, noteBId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, "related"] });
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, "list"] });
      toast.success("Notes linked");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link notes");
    },
  });
}

export function useUnlinkRelatedNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ noteAId, noteBId }: { noteAId: string; noteBId: string }) =>
      noteService.unlinkRelated(user!.id, noteAId, noteBId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, "related"] });
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, "list"] });
      toast.success("Notes unlinked");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink notes");
    },
  });
}

export function useBulkUpdateNotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    archive: useMutation({
      mutationFn: (noteIds: string[]) => noteService.bulkArchive(user!.id, noteIds),
      onSuccess: async () => {
        await invalidateNoteGraph(queryClient);
        toast.success("Notes archived");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to archive notes");
      },
    }),
    updateStatus: useMutation({
      mutationFn: ({ noteIds, status }: { noteIds: string[]; status: NoteStatus }) =>
        noteService.bulkUpdateStatus(user!.id, noteIds, status),
      onSuccess: async () => {
        await invalidateNoteGraph(queryClient);
        toast.success("Status updated");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to update status");
      },
    }),
    updateNotebook: useMutation({
      mutationFn: ({ noteIds, notebook }: { noteIds: string[]; notebook: string | null }) =>
        noteService.bulkUpdateNotebook(user!.id, noteIds, notebook),
      onSuccess: async () => {
        await invalidateNoteGraph(queryClient);
        toast.success("Notebook updated");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to move notes");
      },
    }),
    delete: useMutation({
      mutationFn: (noteIds: string[]) => noteService.bulkDelete(user!.id, noteIds),
      onSuccess: async () => {
        await invalidateNoteGraph(queryClient);
        toast.success("Notes deleted");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to delete notes");
      },
    }),
  };
}

export function useArchiveNoteWithUndo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => noteService.archive(user!.id, id),
    onSuccess: async (_, id) => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note archived", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await noteService.restore(user!.id, id);
              await invalidateNoteGraph(queryClient);
              toast.success("Note restored");
            } catch {
              toast.error("Failed to undo");
            }
          },
        },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive note");
    },
  });
}

export function useBulkArchiveNotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (noteIds: string[]) => noteService.bulkArchive(user!.id, noteIds),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Notes archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive notes");
    },
  });
}

export function useBulkDeleteNotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (noteIds: string[]) => noteService.bulkDelete(user!.id, noteIds),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Notes deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete notes");
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => noteService.restore(user!.id, id),
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore note");
    },
  });
}
