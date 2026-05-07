import { createClient } from "../supabase/client";
import type { CreateNoteInput, Note, UpdateNoteInput } from "../types/domain.types";
import { createNoteSchema, updateNoteSchema } from "../validators/note.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import type { NoteStatus } from "../utils/constants";

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, notebook, favorite, pin, is_archived, metadata, created_at, updated_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "note";
}

function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  noteInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...noteInput } = input;

  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    noteInput,
  };
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
    },
  ): Promise<Note[]> {
    let query = createClient()
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

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

    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
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

    return data;
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

    return data;
  },

  /** Resolves by UUID when identifier looks like a UUID, otherwise tries slug. */
  async getByIdentifier(userId: string, identifier: string): Promise<Note> {
    if (UUID_RE.test(identifier)) {
      return this.getById(userId, identifier);
    }
    const note = await this.getBySlug(userId, identifier);
    if (!note) {
      throw new NotFoundError("Note", identifier);
    }
    return note;
  },

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    const validated = createNoteSchema.parse(input);
    const { goalIds, noteInput } = extractGoalIds(validated);

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

    if (goalIds?.length) {
      await this.replaceGoalLinks(data.id, goalIds);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    const { goal_ids, ...rest } = input;
    const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
    const validated = updateNoteSchema.parse(rest);
    const hasNoteUpdates = Object.keys(validated).length > 0;

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
      : await this.getById(userId, id);

    if (goalIds) {
      await this.replaceGoalLinks(id, goalIds);
    }

    return note;
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

    return data;
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

    return (data ?? []).map((r) => r.note as unknown as Note).filter(Boolean);
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

  async getWithRelations(noteId: string): Promise<{ goal_ids: string[] }> {
    const { data, error } = await createClient()
      .from("goal_notes")
      .select("goal_id")
      .eq("note_id", noteId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return { goal_ids: data?.map((r) => r.goal_id) || [] };
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

    return notes || [];
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

    return data;
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
