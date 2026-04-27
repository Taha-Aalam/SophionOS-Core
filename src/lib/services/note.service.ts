import { createClient } from "../supabase/client";
import type { CreateNoteInput, Note, UpdateNoteInput } from "../types/domain.types";
import { createNoteSchema, updateNoteSchema } from "../validators/note.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import type { NoteStatus } from "../utils/constants";

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, content, type, status, notebook, favorite, pin, is_archived, metadata, created_at, updated_at";

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

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    const validated = createNoteSchema.parse(input);

    const { data, error } = await createClient()
      .from("notes")
      .insert({ ...validated, user_id: userId })
      .select(NOTE_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    const validated = updateNoteSchema.parse(input);

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
};
