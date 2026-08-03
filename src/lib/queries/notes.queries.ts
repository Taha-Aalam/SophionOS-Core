import type { SupabaseClient } from "@supabase/supabase-js";

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, favorite, pin, is_archived, metadata, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hydrateNotebooks(supabase: SupabaseClient, notes: any[]) {
  if (notes.length === 0) return notes;
  const ids = notes.map((n) => n.id);
  const { data } = await supabase.from("note_notebooks").select("note_id, notebook").in("note_id", ids);
  const byNote = new Map<string, string[]>();
  for (const row of (data ?? []) as Array<{ note_id: string; notebook: string }>) {
    byNote.set(row.note_id, [...(byNote.get(row.note_id) ?? []), row.notebook]);
  }
  return notes.map((n) => ({ ...n, notebooks: (byNote.get(n.id) ?? []).sort() }));
}

type NoteLike = {
  area_id: string | null;
  id: string;
  project_id: string | null;
};

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

async function hydrateAreaLinks(
  supabase: SupabaseClient,
  notes: NoteLike[],
): Promise<Array<NoteLike & { linkedAreaIds: string[] }>> {
  if (notes.length === 0) {
    return [];
  }

  const noteIds = notes.map((note) => note.id);
  const { data } = await supabase
    .from("note_areas")
    .select("note_id, area_id")
    .in("note_id", noteIds);

  const areaIdsByNoteId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = areaIdsByNoteId.get(row.note_id) ?? [];
    current.push(row.area_id);
    areaIdsByNoteId.set(row.note_id, current);
  }

  return notes.map((note) => ({
    ...note,
    linkedAreaIds: dedupe([note.area_id, ...(areaIdsByNoteId.get(note.id) ?? [])]),
  }));
}

export async function hydrateGoalLinks(
  supabase: SupabaseClient,
  notes: NoteLike[],
): Promise<Array<NoteLike & { linkedGoalIds: string[] }>> {
  if (notes.length === 0) {
    return [];
  }

  const noteIds = notes.map((note) => note.id);
  const { data } = await supabase
    .from("goal_notes")
    .select("note_id, goal_id")
    .in("note_id", noteIds);

  const goalIdsByNoteId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = goalIdsByNoteId.get(row.note_id) ?? [];
    current.push(row.goal_id);
    goalIdsByNoteId.set(row.note_id, current);
  }

  return notes.map((note) => ({
    ...note,
    linkedGoalIds: goalIdsByNoteId.get(note.id) ?? [],
  }));
}

async function hydrateProjectLinks(
  supabase: SupabaseClient,
  notes: NoteLike[],
): Promise<Array<NoteLike & { linkedProjectIds: string[] }>> {
  if (notes.length === 0) {
    return [];
  }

  const noteIds = notes.map((note) => note.id);
  const { data } = await supabase
    .from("note_projects")
    .select("note_id, project_id")
    .in("note_id", noteIds);

  const projectIdsByNoteId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = projectIdsByNoteId.get(row.note_id) ?? [];
    current.push(row.project_id);
    projectIdsByNoteId.set(row.note_id, current);
  }

  return notes.map((note) => ({
    ...note,
    linkedProjectIds: dedupe([note.project_id, ...(projectIdsByNoteId.get(note.id) ?? [])]),
  }));
}

export async function serverFetchNotes(
  supabase: SupabaseClient,
  userId: string,
  filters: { includeArchived?: boolean } = {},
) {
  let query = supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!filters.includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const notes = (data ?? []) as NoteLike[];

  const [withAreas, withProjects, withGoals] = await Promise.all([
    hydrateAreaLinks(supabase, notes),
    hydrateProjectLinks(supabase, notes),
    hydrateGoalLinks(supabase, notes),
  ]);

  const mapped = notes.map((note, index) => ({
    ...note,
    linkedAreaIds: withAreas[index]?.linkedAreaIds ?? dedupe([note.area_id]),
    linkedProjectIds: withProjects[index]?.linkedProjectIds ?? dedupe([note.project_id]),
    linkedGoalIds: withGoals[index]?.linkedGoalIds ?? [],
  }));

  return hydrateNotebooks(supabase, mapped);
}
