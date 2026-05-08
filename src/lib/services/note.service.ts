import { z } from "zod";

import { createClient } from "../supabase/client";
import type { CreateNoteInput, Note, UpdateNoteInput } from "../types/domain.types";
import { createNoteSchema, updateNoteSchema } from "../validators/note.schema";
import { DatabaseError, NotFoundError, ValidationError } from "../api/error-handler";
import type { NoteStatus } from "../utils/constants";
import {
  buildSlug,
  dedupeAreaIds,
  extractGoalIds,
  extractNoteAreaIds,
  extractProjectIds,
  extractTaskIds,
  isMissingNoteAreasTableError,
  isMissingTaskNotesTableError,
  isValidUUID,
  normalizeTypeSlug,
} from "./note.helpers";

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, notebook, favorite, pin, is_archived, metadata, created_at, updated_at";

function withPrimaryAreaLinks(notes: Note[]): Note[] {
  return notes.map((note) => ({
    ...note,
    linkedAreaIds: dedupeAreaIds([note.area_id]),
  }));
}

async function hydrateNoteAreaLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;

  const noteIds = notes.map((n) => n.id);

  try {
    const result = await createClient()
      .from("note_areas")
      .select("note_id, area_id")
      .in("note_id", noteIds);

    if (result.error) {
      if (isMissingNoteAreasTableError(result.error)) {
        return withPrimaryAreaLinks(notes);
      }
      throw new DatabaseError(result.error.message);
    }

    const areaIdsByNoteId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = areaIdsByNoteId.get(row.note_id) ?? [];
      current.push(row.area_id);
      areaIdsByNoteId.set(row.note_id, current);
    }

    return notes.map((note) => ({
      ...note,
      linkedAreaIds: dedupeAreaIds([note.area_id, ...(areaIdsByNoteId.get(note.id) ?? [])]),
    }));
  } catch (error) {
    if (isMissingNoteAreasTableError(error)) {
      return withPrimaryAreaLinks(notes);
    }
    throw error;
  }
}

async function hydrateNoteGoalLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;

  const noteIds = notes.map((n) => n.id);

  const result = await createClient()
    .from("goal_notes")
    .select("note_id, goal_id")
    .in("note_id", noteIds);

  if (result.error) {
    throw new DatabaseError(result.error.message);
  }

  const goalIdsByNoteId = new Map<string, string[]>();
  for (const row of result.data ?? []) {
    const current = goalIdsByNoteId.get(row.note_id) ?? [];
    current.push(row.goal_id);
    goalIdsByNoteId.set(row.note_id, current);
  }

  return notes.map((note) => ({
    ...note,
    linkedGoalIds: goalIdsByNoteId.get(note.id) ?? [],
  }));
}

async function hydrateNoteTaskLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;

  const noteIds = notes.map((n) => n.id);

  try {
    const result = await createClient()
      .from("task_notes")
      .select("note_id, task_id")
      .in("note_id", noteIds);

    if (result.error) {
      if (isMissingTaskNotesTableError(result.error)) {
        return notes.map((n) => ({ ...n, linkedTaskIds: [] }));
      }
      throw new DatabaseError(result.error.message);
    }

    const taskIdsByNoteId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = taskIdsByNoteId.get(row.note_id) ?? [];
      current.push(row.task_id);
      taskIdsByNoteId.set(row.note_id, current);
    }

    return notes.map((note) => ({
      ...note,
      linkedTaskIds: taskIdsByNoteId.get(note.id) ?? [],
    }));
  } catch (error) {
    if (isMissingTaskNotesTableError(error)) {
      return notes.map((n) => ({ ...n, linkedTaskIds: [] }));
    }
    throw error;
  }
}

async function hydrateNoteProjectLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;

  const noteIds = notes.map((n) => n.id);

  try {
    const result = await createClient()
      .from("note_projects")
      .select("note_id, project_id")
      .in("note_id", noteIds);

    if (result.error) {
      if (result.error.code === "42P01") {
        return notes.map((note) => ({
          ...note,
          linkedProjectIds: dedupeAreaIds([note.project_id]),
        }));
      }
      throw new DatabaseError(result.error.message);
    }

    const projectIdsByNoteId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = projectIdsByNoteId.get(row.note_id) ?? [];
      current.push(row.project_id);
      projectIdsByNoteId.set(row.note_id, current);
    }

    return notes.map((note) => ({
      ...note,
      linkedProjectIds: dedupeAreaIds([
        note.project_id,
        ...(projectIdsByNoteId.get(note.id) ?? []),
      ]),
    }));
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    return notes.map((note) => ({
      ...note,
      linkedProjectIds: dedupeAreaIds([note.project_id]),
    }));
  }
}

async function hydrateNoteRelations(notes: Note[]): Promise<Note[]> {
  const withAreas = await hydrateNoteAreaLinks(notes);
  const withGoals = await hydrateNoteGoalLinks(withAreas);
  const withProjects = await hydrateNoteProjectLinks(withGoals);
  return await hydrateNoteTaskLinks(withProjects);
}

async function hydrateSingleNoteRelations(note: Note): Promise<Note> {
  const [hydrated] = await hydrateNoteRelations([note]);
  return hydrated;
}

async function upsertNoteType(userId: string, typeName: string): Promise<void> {
  const slug = normalizeTypeSlug(typeName);
  if (!slug) return;

  const { error } = await createClient()
    .from("note_types")
    .upsert({ user_id: userId, name: typeName.trim(), slug }, { onConflict: "user_id,slug" });

  if (error) {
    if (!isMissingNoteAreasTableError(error)) {
      throw new DatabaseError(error.message);
    }
  }
}

export const noteService = {
  async list(
    userId: string,
    filters?: {
      status?: NoteStatus | "all";
      favorite?: boolean;
      notebook?: string;
      areaId?: string;
      projectId?: string;
      includeArchived?: boolean;
    },
  ): Promise<Note[]> {
    let query = createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId);

    if (!filters?.includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.favorite !== undefined) {
      query = query.eq("favorite", filters.favorite);
    }
    if (filters?.notebook) {
      query = query.eq("notebook", filters.notebook);
    }
    if (filters?.areaId) {
      query = query.eq("area_id", filters.areaId);
    }
    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateNoteRelations(data || []);
  },

  async getById(userId: string, id: string): Promise<Note> {
    const { data, error } = await createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Note", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleNoteRelations(data);
  },

  async getBySlug(userId: string, slug: string): Promise<Note | null> {
    const { data, error } = await createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    if (!data) return null;
    return hydrateSingleNoteRelations(data);
  },

  /** Resolves by UUID when identifier looks like a UUID, otherwise tries slug. */
  async getByIdentifier(userId: string, identifier: string): Promise<Note> {
    if (isValidUUID(identifier)) {
      return this.getById(userId, identifier);
    }
    const note = await this.getBySlug(userId, identifier);
    if (!note) {
      throw new NotFoundError("Note", identifier);
    }
    return note;
  },

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    try {
      const validated = createNoteSchema.parse(input);
      const { areaIds, noteInput: areaCleanedInput } = extractNoteAreaIds(validated);
      const { goalIds, noteInput: goalCleanedInput } = extractGoalIds(areaCleanedInput);
      const { projectIds, noteInput: projectCleanedInput } = extractProjectIds(goalCleanedInput);
      const { taskIds, noteInput } = extractTaskIds(projectCleanedInput);

      if (validated.type) {
        await upsertNoteType(userId, validated.type);
      }

      const baseSlug = buildSlug(validated.name);
      let slug = baseSlug;
      let counter = 2;
      let data: Note | null = null;

      while (!data) {
        const { data: insertData, error } = await createClient()
          .from("notes")
          .insert({ ...noteInput, user_id: userId, slug })
          .select(NOTE_SELECT)
          .single();

        if (!error) {
          data = insertData;
          break;
        }

        if (error.code === "23505") {
          slug = `${baseSlug}-${counter}`;
          counter++;
          continue;
        }

        throw new DatabaseError(error.message);
      }

      if (areaIds?.length) {
        await this.replaceAreaLinks(data.id, areaIds);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(data.id, goalIds);
      }

      if (projectIds?.length) {
        await this.replaceProjectLinks(data.id, projectIds);
      }

      if (taskIds?.length) {
        await this.replaceTaskLinks(data.id, taskIds);
      }

      return hydrateSingleNoteRelations(data);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    try {
      const { goal_ids, task_ids, project_ids, ...rest } = input;
      const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
      const taskIds = task_ids ? Array.from(new Set(task_ids)) : undefined;
      const projectIds = project_ids ? Array.from(new Set(project_ids)) : undefined;
      const { areaIds, noteInput: areaCleanedInput } = extractNoteAreaIds({ ...rest, project_ids });
      const { noteInput: projectCleanedInput } = extractProjectIds(areaCleanedInput);
      const validated = updateNoteSchema.parse(projectCleanedInput);
      const hasNoteUpdates = Object.keys(validated).length > 0;

      if (validated.type) {
        await upsertNoteType(userId, validated.type);
      }

      const note = hasNoteUpdates
        ? await (async () => {
            const { data, error } = await createClient()
              .from("notes")
              .update(validated)
              .eq("user_id", userId)
              .eq("id", id)
              .select(NOTE_SELECT)
              .single();

            if (error) {
              if (error.code === "PGRST116") {
                throw new NotFoundError("Note", id);
              }
              throw new DatabaseError(error.message);
            }

            return data;
          })()
        : await (async () => {
            const { data, error } = await createClient()
              .from("notes")
              .select(NOTE_SELECT)
              .eq("user_id", userId)
              .eq("id", id)
              .single();

            if (error) {
              if (error.code === "PGRST116") {
                throw new NotFoundError("Note", id);
              }
              throw new DatabaseError(error.message);
            }

            return data;
          })();

      if (areaIds) {
        await this.replaceAreaLinks(id, areaIds);
      }

      if (goalIds) {
        await this.replaceGoalLinks(id, goalIds);
      }

      if (projectIds) {
        await this.replaceProjectLinks(id, projectIds);
      }

      if (taskIds) {
        await this.replaceTaskLinks(id, taskIds);
      }

      return hydrateSingleNoteRelations(note);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async archive(userId: string, id: string): Promise<Note> {
    const { data, error } = await createClient()
      .from("notes")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", id)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Note", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleNoteRelations(data);
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("notes")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async listByArea(userId: string, areaId: string): Promise<Note[]> {
    return this.list(userId, { areaId });
  },

  async listByProject(userId: string, projectId: string): Promise<Note[]> {
    return this.list(userId, { projectId });
  },

  async listNotebooks(userId: string): Promise<string[]> {
    const { data, error } = await createClient()
      .from("notes")
      .select("notebook")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .not("notebook", "is", null);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const notebooks = new Set<string>();
    for (const row of data || []) {
      if (row.notebook) notebooks.add(row.notebook);
    }

    return Array.from(notebooks).sort();
  },

  async listByGoal(userId: string, goalId: string): Promise<Note[]> {
    const { data, error } = await createClient()
      .from("goal_notes")
      .select("note:notes(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const notes = (data ?? []).map((r) => r.note as unknown as Note).filter(Boolean);
    return hydrateNoteRelations(notes);
  },

  async linkToGoal(goalId: string, noteId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_notes")
      .upsert({ goal_id: goalId, note_id: noteId });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async unlinkFromGoal(goalId: string, noteId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_notes")
      .delete()
      .eq("goal_id", goalId)
      .eq("note_id", noteId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async getWithRelations(noteId: string): Promise<{ goal_ids: string[]; task_ids: string[]; area_ids: string[]; project_ids: string[] }> {
    const [goalResult, taskResult, areaResult, projectResult] = await Promise.all([
      createClient().from("goal_notes").select("goal_id").eq("note_id", noteId),
      createClient().from("task_notes").select("task_id").eq("note_id", noteId),
      createClient().from("note_areas").select("area_id").eq("note_id", noteId),
      createClient().from("note_projects").select("project_id").eq("note_id", noteId),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    const isMissingProjectsTable = projectResult.error?.code === "42P01";
    const projectIds = isMissingProjectsTable
      ? []
      : (projectResult.data?.map((r) => r.project_id) || []);

    if (taskResult.error) {
      if (isMissingTaskNotesTableError(taskResult.error)) {
        return {
          goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
          task_ids: [],
          area_ids: areaResult.error && isMissingNoteAreasTableError(areaResult.error)
            ? []
            : areaResult.data?.map((r) => r.area_id) || [],
          project_ids: projectIds,
        };
      }
      throw new DatabaseError(taskResult.error.message);
    }

    if (areaResult.error) {
      if (isMissingNoteAreasTableError(areaResult.error)) {
        return {
          goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
          task_ids: taskResult.data?.map((r) => r.task_id) || [],
          area_ids: [],
          project_ids: projectIds,
        };
      }
      throw new DatabaseError(areaResult.error.message);
    }

    if (projectResult.error && !isMissingProjectsTable) {
      throw new DatabaseError(projectResult.error.message);
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
      task_ids: taskResult.data?.map((r) => r.task_id) || [],
      area_ids: areaResult.data?.map((r) => r.area_id) || [],
      project_ids: projectIds,
    };
  },

  async replaceGoalLinks(noteId: string, goalIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(noteId);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_notes")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, note_id: noteId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_notes")
        .delete()
        .eq("note_id", noteId)
        .in("goal_id", goalIdsToRemove);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async replaceAreaLinks(noteId: string, areaIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(noteId);
    const existingAreaIds = new Set(existingRelations.area_ids);
    const nextAreaIds = new Set(areaIds);
    const areaIdsToAdd = areaIds.filter((areaId) => !existingAreaIds.has(areaId));
    const areaIdsToRemove = existingRelations.area_ids.filter((areaId) => !nextAreaIds.has(areaId));

    if (areaIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("note_areas")
        .insert(areaIdsToAdd.map((area_id) => ({ area_id, note_id: noteId })));

      if (error && !isMissingNoteAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (areaIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("note_areas")
        .delete()
        .eq("note_id", noteId)
        .in("area_id", areaIdsToRemove);

      if (error && !isMissingNoteAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async replaceProjectLinks(noteId: string, projectIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(noteId);
    const existingProjectIds = new Set(existingRelations.project_ids);
    const nextProjectIds = new Set(projectIds);
    const projectIdsToAdd = projectIds.filter((projectId) => !existingProjectIds.has(projectId));
    const projectIdsToRemove = existingRelations.project_ids.filter((projectId) => !nextProjectIds.has(projectId));

    if (projectIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("note_projects")
        .insert(projectIdsToAdd.map((project_id) => ({ project_id, note_id: noteId })));

      if (error) {
        if (error.code !== "42P01") {
          throw new DatabaseError(error.message);
        }
      }
    }

    if (projectIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("note_projects")
        .delete()
        .eq("note_id", noteId)
        .in("project_id", projectIdsToRemove);

      if (error) {
        if (error.code !== "42P01") {
          throw new DatabaseError(error.message);
        }
      }
    }
  },

  async replaceTaskLinks(noteId: string, taskIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(noteId);
    const existingTaskIds = new Set(existingRelations.task_ids);
    const nextTaskIds = new Set(taskIds);
    const taskIdsToAdd = taskIds.filter((taskId) => !existingTaskIds.has(taskId));
    const taskIdsToRemove = existingRelations.task_ids.filter((taskId) => !nextTaskIds.has(taskId));

    if (taskIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("task_notes")
        .insert(taskIdsToAdd.map((task_id) => ({ task_id, note_id: noteId })));

      if (error) {
        if (!isMissingTaskNotesTableError(error)) {
          throw new DatabaseError(error.message);
        }
      }
    }

    if (taskIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("task_notes")
        .delete()
        .eq("note_id", noteId)
        .in("task_id", taskIdsToRemove);

      if (error) {
        if (!isMissingTaskNotesTableError(error)) {
          throw new DatabaseError(error.message);
        }
      }
    }
  },

  async getByNotebook(userId: string, notebook: string): Promise<Note[]> {
    return this.list(userId, { notebook });
  },

  async getRelated(userId: string, noteId: string): Promise<Note[]> {
    const { data, error } = await createClient()
      .from("note_related_notes")
      .select("note_a_id, note_b_id")
      .or(`note_a_id.eq.${noteId},note_b_id.eq.${noteId}`);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const relatedIds = new Set<string>();
    for (const row of data ?? []) {
      if (row.note_a_id !== noteId) relatedIds.add(row.note_a_id);
      if (row.note_b_id !== noteId) relatedIds.add(row.note_b_id);
    }

    if (relatedIds.size === 0) return [];

    const { data: notes, error: notesError } = await createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .in("id", Array.from(relatedIds));

    if (notesError) {
      throw new DatabaseError(notesError.message);
    }

    return hydrateNoteRelations(notes || []);
  },

  async linkRelated(_userId: string, noteAId: string, noteBId: string): Promise<void> {
    if (noteAId === noteBId) {
      throw new DatabaseError("Cannot link a note to itself");
    }
    const a = noteAId < noteBId ? noteAId : noteBId;
    const b = noteAId < noteBId ? noteBId : noteAId;

    const { error } = await createClient()
      .from("note_related_notes")
      .upsert({ note_a_id: a, note_b_id: b });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async unlinkRelated(_userId: string, noteAId: string, noteBId: string): Promise<void> {
    const a = noteAId < noteBId ? noteAId : noteBId;
    const b = noteAId < noteBId ? noteBId : noteAId;

    const { error } = await createClient()
      .from("note_related_notes")
      .delete()
      .eq("note_a_id", a)
      .eq("note_b_id", b);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async bulkArchive(userId: string, noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const { error } = await createClient()
      .from("notes")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .in("id", noteIds);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async bulkUpdateStatus(userId: string, noteIds: string[], status: NoteStatus): Promise<void> {
    if (noteIds.length === 0) return;
    const { error } = await createClient()
      .from("notes")
      .update({ status })
      .eq("user_id", userId)
      .in("id", noteIds);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async bulkUpdateNotebook(userId: string, noteIds: string[], notebook: string | null): Promise<void> {
    if (noteIds.length === 0) return;
    const { error } = await createClient()
      .from("notes")
      .update({ notebook })
      .eq("user_id", userId)
      .in("id", noteIds);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async bulkDelete(userId: string, noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const { error } = await createClient()
      .from("notes")
      .delete()
      .eq("user_id", userId)
      .in("id", noteIds);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async restore(userId: string, id: string): Promise<Note> {
    const { data, error } = await createClient()
      .from("notes")
      .update({ is_archived: false })
      .eq("user_id", userId)
      .eq("id", id)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Note", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleNoteRelations(data);
  },

  async listTypes(userId: string): Promise<{ id: string; name: string; slug: string }[]> {
    const { data, error } = await createClient()
      .from("note_types")
      .select("id, name, slug")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      if (isMissingNoteAreasTableError(error)) {
        return [];
      }
      throw new DatabaseError(error.message);
    }

    return data || [];
  },

  async getNoteGoalIds(userId: string, noteIds: string[]): Promise<Map<string, string[]>> {
    if (noteIds.length === 0) return new Map();
    const { data, error } = await createClient()
      .from("goal_notes")
      .select("goal_id, note_id")
      .in("note_id", noteIds);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const result = new Map<string, string[]>();
    for (const row of data ?? []) {
      const arr = result.get(row.note_id) ?? [];
      arr.push(row.goal_id);
      result.set(row.note_id, arr);
    }
    return result;
  },

  async getNoteAreaIds(userId: string, noteIds: string[]): Promise<Map<string, string[]>> {
    if (noteIds.length === 0) return new Map();
    try {
      const { data, error } = await createClient()
        .from("note_areas")
        .select("area_id, note_id")
        .in("note_id", noteIds);

      if (error) {
        if (isMissingNoteAreasTableError(error)) {
          return new Map();
        }
        throw new DatabaseError(error.message);
      }

      const result = new Map<string, string[]>();
      for (const row of data ?? []) {
        const arr = result.get(row.note_id) ?? [];
        arr.push(row.area_id);
        result.set(row.note_id, arr);
      }
      return result;
    } catch (error) {
      if (isMissingNoteAreasTableError(error)) {
        return new Map();
      }
      throw error;
    }
  },

  async getNoteTaskIds(userId: string, noteIds: string[]): Promise<Map<string, string[]>> {
    if (noteIds.length === 0) return new Map();
    try {
      const { data, error } = await createClient()
        .from("task_notes")
        .select("task_id, note_id")
        .in("note_id", noteIds);

      if (error) {
        if (isMissingTaskNotesTableError(error)) {
          return new Map();
        }
        throw new DatabaseError(error.message);
      }

      const result = new Map<string, string[]>();
      for (const row of data ?? []) {
        const arr = result.get(row.note_id) ?? [];
        arr.push(row.task_id);
        result.set(row.note_id, arr);
      }
      return result;
    } catch (error) {
      if (isMissingTaskNotesTableError(error)) {
        return new Map();
      }
      throw error;
    }
  },

  async getNoteRelatedCounts(userId: string, noteIds: string[]): Promise<Map<string, number>> {
    if (noteIds.length === 0) return new Map();
    const { data, error } = await createClient()
      .from("note_related_notes")
      .select("note_a_id, note_b_id")
      .or(noteIds.map((id) => `note_a_id.eq.${id},note_b_id.eq.${id}`).join(","));

    if (error) {
      throw new DatabaseError(error.message);
    }

    const result = new Map<string, number>();
    for (const id of noteIds) result.set(id, 0);
    for (const row of data ?? []) {
      const countA = (result.get(row.note_a_id) ?? 0) + 1;
      const countB = (result.get(row.note_b_id) ?? 0) + 1;
      result.set(row.note_a_id, countA);
      result.set(row.note_b_id, countB);
    }
    return result;
  },
};
