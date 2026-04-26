import { createClient } from "../supabase/client";
import type { Area, CreateAreaInput, UpdateAreaInput } from "../types/domain.types";
import { createAreaSchema, updateAreaSchema } from "../validators/area.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { generateSlug } from "../utils";
import { normalizeAreaType } from "../utils/areas";

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at";

type AreaSelect = Pick<
  Area,
  | "id"
  | "user_id"
  | "name"
  | "description"
  | "icon"
  | "color"
  | "type"
  | "metadata"
  | "inactive"
  | "archive"
  | "slug"
  | "created_at"
  | "updated_at"
>;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const areaService = {
  async list(
    userId?: string,
    filters?: { inactive?: boolean; archive?: boolean; limit?: number; offset?: number },
  ): Promise<AreaSelect[]> {
    const { inactive, archive, limit = 50, offset = 0 } = filters ?? {};
    let query = createClient()
      .from("areas")
      .select(AREA_SELECT)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (inactive !== undefined) {
      query = query.eq("inactive", inactive);
    }
    if (archive !== undefined) {
      query = query.eq("archive", archive);
    }

    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data as AreaSelect[]) || [];
  },

  async getByIdentifier(userId: string, identifier: string): Promise<AreaSelect> {
    try {
      return await this.getBySlug(userId, identifier);
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }

      if (!isUuid(identifier)) {
        throw error;
      }
    }

    return this.getById(userId, identifier);
  },

  async getGroupedByType(userId: string): Promise<{ type: string; areas: AreaSelect[] }[]> {
    const { data, error } = await createClient()
      .from("areas")
      .select(AREA_SELECT)
      .eq("user_id", userId)
      .eq("archive", false)
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new DatabaseError(error.message);
    }

    const grouped = new Map<string, AreaSelect[]>();
    for (const area of data || []) {
      const type = normalizeAreaType(area.type);
      if (!area.slug) {
        area.slug = generateSlug(area.name);
      }
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(area as AreaSelect);
    }

    return Array.from(grouped.entries())
      .map(([type, areas]) => ({ type, areas }))
      .sort((a, b) => a.type.localeCompare(b.type));
  },

  async getById(userId: string, id: string): Promise<AreaSelect> {
    const { data, error } = await createClient()
      .from("areas")
      .select(AREA_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Area", id);
      }

      throw new DatabaseError(error.message);
    }
    return data as AreaSelect;
  },

  async getBySlug(userId: string, slug: string): Promise<AreaSelect> {
    const { data, error } = await createClient()
      .from("areas")
      .select(AREA_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Area", slug);
      }

      throw new DatabaseError(error.message);
    }
    return data as AreaSelect;
  },

  async create(userId: string, input: CreateAreaInput): Promise<AreaSelect> {
    const validated = createAreaSchema.parse(input);
    const normalizedType = normalizeAreaType(validated.type);

    if (!validated.slug && validated.name) {
      validated.slug = generateSlug(validated.name);
    }

    const { data, error } = await createClient()
      .from("areas")
      .insert({ ...validated, type: normalizedType, user_id: userId })
      .select(AREA_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data as AreaSelect;
  },

  async update(userId: string, id: string, input: UpdateAreaInput): Promise<AreaSelect> {
    const validated = updateAreaSchema.parse(input);
    const nextType = validated.type ? normalizeAreaType(validated.type) : undefined;

    if (!validated.slug && validated.name) {
      validated.slug = generateSlug(validated.name);
    }

    const { data, error } = await createClient()
      .from("areas")
      .update({
        ...validated,
        ...(nextType ? { type: nextType } : {}),
      })
      .eq("user_id", userId)
      .eq("id", id)
      .select(AREA_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Area", id);
      }

      throw new DatabaseError(error.message);
    }
    return data as AreaSelect;
  },

  async restore(userId: string, id: string): Promise<AreaSelect> {
    const { data, error } = await createClient()
      .from("areas")
      .update({ archive: false })
      .eq("user_id", userId)
      .eq("id", id)
      .select(AREA_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Area", id);
      }

      throw new DatabaseError(error.message);
    }
    return data as AreaSelect;
  },

  async archive(userId: string, id: string): Promise<AreaSelect> {
    const { data, error } = await createClient()
      .from("areas")
      .update({ archive: true })
      .eq("user_id", userId)
      .eq("id", id)
      .select(AREA_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Area", id);
      }

      throw new DatabaseError(error.message);
    }
    return data as AreaSelect;
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("areas")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};
