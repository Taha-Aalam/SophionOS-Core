const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

export function buildSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "note"
  );
}

export function normalizeTypeSlug(typeName: string): string {
  return typeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dedupeAreaIds(
  areaIds: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(areaIds.filter((id): id is string => Boolean(id))),
  );
}

export function extractNoteAreaIds<
  TInput extends { area_id?: string | null; area_ids?: string[] },
>(
  input: TInput,
): {
  areaIds: string[] | undefined;
  noteInput: Omit<TInput, "area_ids">;
} {
  const { area_ids, area_id, ...rest } = input;

  // Merge the singular area_id and the area_ids array instead of treating
  // them as mutually exclusive. The create schema defaults area_ids to [],
  // so a sole area_id would otherwise be silently overwritten by the empty
  // default — the link would never be created. Combining both sources
  // ensures either field works.
  const hasAreaIds = Array.isArray(area_ids) && area_ids.length > 0;
  const hasAreaId = typeof area_id === "string" && area_id.length > 0;
  if (hasAreaIds || hasAreaId) {
    const normalizedAreaIds = dedupeAreaIds([
      ...(hasAreaIds ? area_ids : []),
      ...(hasAreaId ? [area_id] : []),
    ]);
    return {
      areaIds: normalizedAreaIds,
      noteInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  return {
    areaIds: undefined,
    noteInput: {
      ...rest,
    } as Omit<TInput, "area_ids">,
  };
}

export function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  noteInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...noteInput } = input;

  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    noteInput,
  };
}

export function extractProjectIds(input: { project_ids?: string[] }): {
  projectIds: string[] | undefined;
  noteInput: Omit<typeof input, "project_ids">;
} {
  const { project_ids, ...noteInput } = input;

  return {
    projectIds: project_ids ? Array.from(new Set(project_ids)) : undefined,
    noteInput,
  };
}

export function extractTaskIds(input: { task_ids?: string[] }): {
  taskIds: string[] | undefined;
  noteInput: Omit<typeof input, "task_ids">;
} {
  const { task_ids, ...noteInput } = input;

  return {
    taskIds: task_ids ? Array.from(new Set(task_ids)) : undefined,
    noteInput,
  };
}

export function extractNotebooks<T extends { notebooks?: string[] }>(
  input: T,
): { notebooks: string[]; noteInput: Omit<T, "notebooks"> } {
  const { notebooks, ...noteInput } = input;
  const cleaned = Array.from(
    new Set((notebooks ?? []).map((n) => n.trim()).filter((n) => n.length > 0)),
  );
  return { notebooks: cleaned, noteInput };
}

export function isMissingNoteAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("note_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

export function isMissingTaskNotesTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("task_notes") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}
