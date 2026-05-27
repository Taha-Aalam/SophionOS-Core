import { z } from "zod";

import { createClient } from "../supabase/client";
import type {
  CreateNoteInput,
  Note,
  RelatedNotebookGroup,
  UpdateNoteInput,
} from "../types/domain.types";
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
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, favorite, pin, is_archived, metadata, created_at, updated_at";

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

async function hydrateNoteNotebookLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;
  const noteIds = notes.map((n) => n.id);
  const { data, error } = await createClient()
    .from("note_notebooks")
    .select("note_id, notebook")
    .in("note_id", noteIds);
  if (error) {
    if (error.code === "42P01") {
      return notes.map((note) => ({ ...note, notebooks: [] }));
    }
    throw new DatabaseError(error.message);
  }
  const byNote = new Map<string, string[]>();
  for (const row of data ?? []) {
    byNote.set(row.note_id, [...(byNote.get(row.note_id) ?? []), row.notebook]);
  }
  return notes.map((note) => ({ ...note, notebooks: (byNote.get(note.id) ?? []).sort() }));
}

async function hydrateNoteRelations(notes: Note[]): Promise<Note[]> {
  const withAreas = await hydrateNoteAreaLinks(notes);
  const withGoals = await hydrateNoteGoalLinks(withAreas);
  const withProjects = await hydrateNoteProjectLinks(withGoals);
  const withTasks = await hydrateNoteTaskLinks(withProjects);
  return await hydrateNoteNotebookLinks(withTasks);
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
    // notebook column dropped in favor of note_notebooks junction table
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
      const { notebooks: notebooksInput, ...inputWithoutNotebooks } = input;
      const notebooks = Array.from(
        new Set((notebooksInput ?? []).map((n) => n.trim()).filter((n) => n.length > 0)),
      );
      const validated = createNoteSchema.parse(inputWithoutNotebooks);
      const { areaIds, noteInput: areaCleanedInput } = extractNoteAreaIds(validated);
      const { goalIds, noteInput: goalCleanedInput } = extractGoalIds(areaCleanedInput);
      const { projectIds, noteInput: projectCleanedInput } = extractProjectIds(goalCleanedInput);
      const { taskIds, noteInput: taskCleanedInput } = extractTaskIds(projectCleanedInput);

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
          .insert({ ...taskCleanedInput, user_id: userId, slug })
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

      if (notebooks.length) {
        await this.replaceNotebooks(data.id, notebooks);
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
      const { goal_ids, task_ids, project_ids, notebooks, ...rest } = input;
      const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
      const taskIds = task_ids ? Array.from(new Set(task_ids)) : undefined;
      const projectIds = project_ids ? Array.from(new Set(project_ids)) : undefined;
      const { areaIds, noteInput: areaCleanedInput } = extractNoteAreaIds({ ...rest, project_ids });
      const { noteInput: projectCleanedInput } = extractProjectIds(areaCleanedInput);
      const noteInputFinal = projectIds !== undefined
        ? { ...projectCleanedInput, project_id: projectIds[0] ?? null }
        : projectCleanedInput;
      const validated = updateNoteSchema.parse(noteInputFinal);
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

      if (areaIds !== undefined) {
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

      if (notebooks !== undefined) {
        await this.replaceNotebooks(id, notebooks);
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

  async listByTopic(userId: string, topicId: string): Promise<Note[]> {
    const { data, error } = await createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .order("updated_at", { ascending: false });

    if (error) throw new DatabaseError(error.message);
    return hydrateNoteRelations(data ?? []);
  },

  async listByProject(userId: string, projectId: string): Promise<Note[]> {
    const { data: links, error: linksError } = await createClient()
      .from("note_projects")
      .select("note_id")
      .eq("project_id", projectId);

    if (linksError) {
      if (linksError.code === "42P01") return [];
      throw new DatabaseError(linksError.message);
    }

    const noteIds = (links ?? []).map((l) => l.note_id);
    if (noteIds.length === 0) return [];

    const { data, error } = await createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .in("id", noteIds)
      .order("updated_at", { ascending: false });

    if (error) throw new DatabaseError(error.message);
    return hydrateNoteRelations(data ?? []);
  },

  async listNotebooks(userId: string): Promise<string[]> {
    const { data, error } = await createClient()
      .from("note_notebooks")
      .select("notebook, notes!inner(user_id)")
      .eq("notes.user_id", userId);
    if (error) {
      if (error.code === "42P01") return [];
      throw new DatabaseError(error.message);
    }
    const set = new Set<string>();
    for (const row of data ?? []) set.add(row.notebook);
    return Array.from(set).sort();
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
    const { data, error } = await createClient()
      .from("notes")
      .select(`${NOTE_SELECT}, note_notebooks!inner(notebook)`)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .eq("note_notebooks.notebook", notebook)
      .order("updated_at", { ascending: false });
    if (error) {
      if (error.code === "42P01") return [];
      throw new DatabaseError(error.message);
    }
    // Strip the embedded join object before hydration.
    const rows = (data ?? []).map(({ note_notebooks: _omit, ...note }) => note) as Note[];
    return hydrateNoteRelations(rows);
  },

  async replaceNotebooks(noteId: string, notebooks: string[]): Promise<void> {
    const client = createClient();
    const { error: delError } = await client.from("note_notebooks").delete().eq("note_id", noteId);
    if (delError) {
      if (delError.code === "42P01") return;
      throw new DatabaseError(delError.message);
    }
    if (notebooks.length === 0) return;
    const rows = notebooks.map((notebook) => ({ note_id: noteId, notebook }));
    const { error } = await client.from("note_notebooks").insert(rows);
    if (error) {
      if (error.code === "42P01") return;
      throw new DatabaseError(error.message);
    }
  },

  async addNotesToNotebook(_userId: string, notebook: string, noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const rows = noteIds.map((note_id) => ({ note_id, notebook }));
    const { error } = await createClient()
      .from("note_notebooks")
      .upsert(rows, { onConflict: "note_id,notebook" });
    if (error) {
      if (error.code === "42P01") return;
      throw new DatabaseError(error.message);
    }
  },

  async removeNoteFromNotebook(_userId: string, noteId: string, notebook: string): Promise<void> {
    const { error } = await createClient()
      .from("note_notebooks")
      .delete()
      .eq("note_id", noteId)
      .eq("notebook", notebook);
    if (error) {
      if (error.code === "42P01") return;
      throw new DatabaseError(error.message);
    }
  },

  async getRelatedByNotebook(userId: string, noteId: string): Promise<RelatedNotebookGroup[]> {
    const { data: nbRows, error: nbError } = await createClient()
      .from("note_notebooks")
      .select("notebook")
      .eq("note_id", noteId);
    if (nbError) {
      if (nbError.code === "42P01") return [];
      throw new DatabaseError(nbError.message);
    }

    const notebooks = Array.from(new Set((nbRows ?? []).map((r) => r.notebook))).sort();
    if (notebooks.length === 0) return [];

    const groups: RelatedNotebookGroup[] = [];
    for (const notebook of notebooks) {
      const members = await this.getByNotebook(userId, notebook);
      const others = members.filter((n) => n.id !== noteId);
      if (others.length > 0) groups.push({ notebook, notes: others });
    }
    return groups;
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

  async getNoteRelatedCounts(_userId: string, noteIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const id of noteIds) result.set(id, 0);
    if (noteIds.length === 0) return result;

    // Which notebooks do the requested notes belong to?
    const { data: own, error: ownErr } = await createClient()
      .from("note_notebooks")
      .select("note_id, notebook")
      .in("note_id", noteIds);
    if (ownErr) {
      if (ownErr.code === "42P01") return result;
      throw new DatabaseError(ownErr.message);
    }

    const notebooksByNote = new Map<string, string[]>();
    const allNotebooks = new Set<string>();
    for (const row of own ?? []) {
      notebooksByNote.set(row.note_id, [...(notebooksByNote.get(row.note_id) ?? []), row.notebook]);
      allNotebooks.add(row.notebook);
    }
    if (allNotebooks.size === 0) return result;

    // All members of those notebooks.
    const { data: members, error: memErr } = await createClient()
      .from("note_notebooks")
      .select("note_id, notebook")
      .in("notebook", Array.from(allNotebooks));
    if (memErr) {
      if (memErr.code === "42P01") return result;
      throw new DatabaseError(memErr.message);
    }

    const membersByNotebook = new Map<string, Set<string>>();
    for (const row of members ?? []) {
      const set = membersByNotebook.get(row.notebook) ?? new Set<string>();
      set.add(row.note_id);
      membersByNotebook.set(row.notebook, set);
    }

    for (const id of noteIds) {
      const related = new Set<string>();
      for (const nb of notebooksByNote.get(id) ?? []) {
        for (const member of membersByNotebook.get(nb) ?? []) {
          if (member !== id) related.add(member);
        }
      }
      result.set(id, related.size);
    }
    return result;
  },
};
