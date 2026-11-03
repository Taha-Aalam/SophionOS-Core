"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import { noteService } from "@/lib/services/note.service";
import { DASHBOARD_QUERY_KEY } from "@/lib/services/dashboard.service";
import { entityLimitToastMessage } from "@/lib/entity-limit";
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/lib/types/domain.types";
import type { NoteStatus } from "@/lib/utils/constants";

export const NOTES_QUERY_KEY = "notes";

/**
 * Note mutations are serialized per note so a fast second click (e.g. complete →
 * reopen) is applied by the server *after* the first, not raced against it —
 * otherwise the older write can land last and the user ends on the wrong state.
 * The sequence counter below additionally stops a late response from an earlier
 * mutation from overwriting the newer optimistic state in the cache.
 */
const noteMutationChains = new Map<string, Promise<unknown>>();
const noteMutationSequence = new Map<string, number>();

function enqueueNoteMutation<T>(id: string, task: () => Promise<T>): Promise<T> {
  const previous = noteMutationChains.get(id) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(task);
  noteMutationChains.set(id, result.catch(() => undefined));
  return result;
}

function nextNoteMutationSequence(id: string): number {
  const next = (noteMutationSequence.get(id) ?? 0) + 1;
  noteMutationSequence.set(id, next);
  return next;
}

function isLatestNoteMutation(id: string, sequence: number): boolean {
  return noteMutationSequence.get(id) === sequence;
}

/**
 * Apply a patch to every rendered copy of one note: list/subcollection arrays,
 * the detail object (by id or slug), and the note arrays embedded in the parent
 * detail caches (area-detail, goal-detail). Values that contain no copy of the
 * note are returned unchanged so unrelated caches are not rewritten.
 */
function patchNoteValue(value: unknown, id: string, patch: Partial<Note>): unknown {
  const patchEntry = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return entry;
    const candidate = entry as { id?: unknown };
    return candidate.id === id ? { ...(entry as object), ...patch } : entry;
  };

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const patched = patchEntry(entry);
      if (patched !== entry) changed = true;
      return patched;
    });
    return changed ? next : value;
  }

  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (record.id === id) return { ...record, ...patch };

  let changed = false;
  const next: Record<string, unknown> = { ...record };
  for (const key of ["notes", "allNotes", "archivedNotes"] as const) {
    const collection = record[key];
    if (!Array.isArray(collection)) continue;
    const patched = collection.map((entry) => {
      const result = patchEntry(entry);
      if (result !== entry) changed = true;
      return result;
    });
    if (changed) next[key] = patched;
  }
  return changed ? next : value;
}

type NoteMutationSnapshot = Array<[readonly unknown[], unknown]>;

function snapshotNoteCaches(
  queryClient: ReturnType<typeof useQueryClient>,
): NoteMutationSnapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: [NOTES_QUERY_KEY] }),
    ...queryClient.getQueriesData({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
    ...queryClient.getQueriesData({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
  ];
}

function applyNotePatch(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Note>,
): void {
  for (const queryKey of [
    [NOTES_QUERY_KEY],
    [AREA_DETAIL_QUERY_KEY],
    [GOAL_DETAIL_QUERY_KEY],
  ]) {
    queryClient.setQueriesData({ queryKey }, (current: unknown) =>
      patchNoteValue(current, id, patch),
    );
  }
}

function restoreNoteCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: NoteMutationSnapshot | undefined,
): void {
  if (!snapshot) return;
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey as readonly unknown[], data);
  }
}

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ noteId, goalId }: { noteId: string; goalId: string }) =>
      noteService.linkToGoal(user!.id, goalId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" });
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
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
    },
  });
}

export function useUnlinkNoteFromGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ noteId, goalId }: { noteId: string; goalId: string }) =>
      noteService.unlinkFromGoal(user!.id, goalId, noteId),
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
  // refetchType: "all" matters for the caches the user is NOT looking at right
  // now: an invalidated-but-inactive query would otherwise stay stale until a
  // manual reload, so navigating to the list/detail/dashboard afterwards could
  // resurrect the pre-mutation value. Dashboard is included because note status
  // feeds its completed / active / inbox counts.
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [NOTE_TYPES_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY], refetchType: "all" }),
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
      toast.error(entityLimitToastMessage(error, "Failed to create note"));
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
      toast.error(entityLimitToastMessage(error, "Failed to create note"));
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    Note,
    Error,
    { id: string; input: UpdateNoteInput },
    { previous: NoteMutationSnapshot; sequence: number }
  >({
    // Serialize per note: the second toggle of a rapid pair reaches the server
    // after the first, so the last click wins authoritatively.
    mutationFn: ({ id, input }) =>
      enqueueNoteMutation(id, () => noteService.update(user!.id, id, input)),
    onMutate: async ({ id, input }) => {
      const sequence = nextNoteMutationSequence(id);
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });
      const previous = snapshotNoteCaches(queryClient);
      // Status/pin/favorite/name/relations all live on the note object, so the
      // same patch path keeps list, detail and parent-page copies in step.
      applyNotePatch(queryClient, id, input as Partial<Note>);
      return { previous, sequence };
    },
    onSuccess: (updated: Note, variables, context) => {
      if (context && !isLatestNoteMutation(variables.id, context.sequence)) {
        return;
      }
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
    },
    onError: (error: Error, variables, context) => {
      // Roll back only our own optimistic patch, and only while it is still the
      // newest intent — a newer toggle keeps its state. The settle refetch then
      // reconciles with server truth.
      if (!context || isLatestNoteMutation(variables.id, context.sequence)) {
        restoreNoteCaches(queryClient, context?.previous);
      }
      toast.error(error.message || "Failed to save note");
    },
    onSettled: async () => {
      await invalidateNoteGraph(queryClient);
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => noteService.archive(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });
      const previous = snapshotNoteCaches(queryClient);
      // The row leaves every active list immediately (filters read
      // `is_archived`); the settle refetch reconciles with server truth.
      applyNotePatch(queryClient, id, { is_archived: true } as Partial<Note>);
      return { previous };
    },
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note archived");
    },
    onError: (error: Error, _id, context) => {
      restoreNoteCaches(queryClient, context?.previous);
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

      // Also patch area-detail and goal-detail caches so the favorite star updates
      // immediately on area and goal detail pages without a manual refresh.
      queryClient.setQueriesData<{ notes: Note[] }>({ queryKey: [AREA_DETAIL_QUERY_KEY] }, (current) => {
        if (!current) return current;
        return {
          ...current,
          notes: current.notes.map((n) => (n.id === id ? { ...n, favorite } : n)),
        };
      });
      queryClient.setQueriesData<{ notes: Note[] }>({ queryKey: [GOAL_DETAIL_QUERY_KEY] }, (current) => {
        if (!current) return current;
        return {
          ...current,
          notes: current.notes.map((n) => (n.id === id ? { ...n, favorite } : n)),
        };
      });

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
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
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

export function useRelatedNotesByNotebook(noteId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "relatedByNotebook", user?.id ?? null, noteId],
    queryFn: () => noteService.getRelatedByNotebook(user!.id, noteId),
    enabled: !!user && !!noteId,
  });
}

export function useAddNotesToNotebook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ notebook, noteIds }: { notebook: string; noteIds: string[] }) =>
      noteService.addNotesToNotebook(user!.id, notebook, noteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Added to notebook");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add to notebook"),
  });
}

export function useRemoveNoteFromNotebook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ noteId, notebook }: { noteId: string; notebook: string }) =>
      noteService.removeNoteFromNotebook(user!.id, noteId, notebook),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Removed from notebook");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove from notebook"),
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
      mutationFn: ({ noteIds, notebook }: { noteIds: string[]; notebook: string }) =>
        noteService.addNotesToNotebook(user!.id, notebook, noteIds),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
        toast.success("Added to notebook");
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
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });
      const previous = snapshotNoteCaches(queryClient);
      applyNotePatch(queryClient, id, { is_archived: false } as Partial<Note>);
      return { previous };
    },
    onSuccess: async () => {
      await invalidateNoteGraph(queryClient);
      toast.success("Note restored");
    },
    onError: (error: Error, _id, context) => {
      restoreNoteCaches(queryClient, context?.previous);
      toast.error(error.message || "Failed to restore note");
    },
  });
}
