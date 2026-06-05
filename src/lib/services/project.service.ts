import { createClient } from "../supabase/client";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../types/domain.types";
import { createProjectSchema, updateProjectSchema } from "../validators/project.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { generateSlug } from "../utils";
import { PROJECT_STATUS, type ProjectStatus } from "../utils/constants";
import { deriveProjectStatus } from "../utils/status-routing";

type ProjectRecord = Omit<Project, "slug"> & { slug?: string | null };
type ProjectQueryError = { code?: string; message?: string } | null;
type ProjectListQueryResult = {
  data: unknown;
  error: ProjectQueryError;
};
type ProjectSingleQueryResult = {
  data: unknown;
  error: ProjectQueryError;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const PROJECT_COLUMNS = [
  "id",
  "user_id",
  "area_id",
  "name",
  "description",
  "status",
  "priority",
  "start_date",
  "due_date",
  "progress",
  "is_archived",
  "slug",
  "created_at",
  "updated_at",
] as const;
const PROJECT_SELECT = PROJECT_COLUMNS.join(", ");
const LEGACY_PROJECT_SELECT = PROJECT_COLUMNS.filter((column) => column !== "slug").join(", ");

function isMissingProjectSlugColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42703" || (message.includes("slug") && message.includes("column"));
}

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((areaId): areaId is string => Boolean(areaId))));
}

function isMissingProjectAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  return (
    code === "42P01" ||
    (normalizedMessage.includes("project_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

function isMissingGoalProjectsTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof (error as Record<string, unknown>).code === "string"
      ? (error as Record<string, unknown>).code
      : undefined;
  const message =
    "message" in error && typeof (error as Record<string, unknown>).message === "string"
      ? String((error as Record<string, unknown>).message).toLowerCase()
      : "";
  return (
    code === "42P01" ||
    (message.includes("goal_projects") &&
      (message.includes("does not exist") || message.includes("relation")))
  );
}

function withPrimaryAreaLinks(projects: Project[]): Project[] {
  return projects.map((project) => ({
    ...project,
    linkedAreaIds: dedupeAreaIds([project.area_id]),
  }));
}

function extractProjectAreaIds<TInput extends { area_id?: string | null; area_ids?: string[] }>(
  input: TInput,
): {
  areaIds: string[] | undefined;
  projectInput: Omit<TInput, "area_ids">;
} {
  const { area_ids, area_id, ...rest } = input;

  if (area_ids !== undefined) {
    const normalizedAreaIds = dedupeAreaIds(area_ids);
    return {
      areaIds: normalizedAreaIds,
      projectInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  if (area_id !== undefined) {
    const normalizedAreaIds = dedupeAreaIds([area_id]);
    return {
      areaIds: normalizedAreaIds,
      projectInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  return {
    areaIds: undefined,
    projectInput: {
      ...rest,
    } as Omit<TInput, "area_ids">,
  };
}

async function hydrateProjectAreaLinks(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) {
    return projects;
  }

  const projectIds = projects.map((project) => project.id);
  let data:
    | Array<{
        project_id: string;
        area_id: string;
      }>
    | null
    | undefined;

  try {
    const result = await createClient()
      .from("project_areas")
      .select("project_id, area_id")
      .in("project_id", projectIds);

    if (result.error) {
      if (isMissingProjectAreasTableError(result.error)) {
        return withPrimaryAreaLinks(projects);
      }

      throw new DatabaseError(result.error.message);
    }

    data = result.data;
  } catch (error) {
    if (isMissingProjectAreasTableError(error)) {
      return withPrimaryAreaLinks(projects);
    }

    throw error;
  }

  const areaIdsByProjectId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const currentAreaIds = areaIdsByProjectId.get(row.project_id) ?? [];
    currentAreaIds.push(row.area_id);
    areaIdsByProjectId.set(row.project_id, currentAreaIds);
  }

  return projects.map((project) => ({
    ...project,
    linkedAreaIds: dedupeAreaIds([
      project.area_id,
      ...(areaIdsByProjectId.get(project.id) ?? []),
    ]),
  }));
}

async function hydrateProjectGoalLinks(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);
  let data: Array<{ project_id: string; goal_id: string }> | null | undefined;

  try {
    const result = await createClient()
      .from("goal_projects")
      .select("project_id, goal_id")
      .in("project_id", projectIds);

    if (result.error) {
      if (isMissingGoalProjectsTableError(result.error)) {
        return projects.map((project) => ({ ...project, linkedGoalIds: [] }));
      }
      throw new DatabaseError(result.error.message);
    }

    data = result.data;
  } catch (error) {
    if (isMissingGoalProjectsTableError(error)) {
      return projects.map((project) => ({ ...project, linkedGoalIds: [] }));
    }
    throw error;
  }

  const goalIdsByProjectId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = goalIdsByProjectId.get(row.project_id) ?? [];
    current.push(row.goal_id);
    goalIdsByProjectId.set(row.project_id, current);
  }

  return projects.map((project) => ({
    ...project,
    linkedGoalIds: goalIdsByProjectId.get(project.id) ?? [],
  }));
}

async function hydrateProjectProgress(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);
  const supabase = createClient();

  const [
    { data: taskRows },
    { data: noteRows },
    { data: noteJunctionRows },
    { data: resourceRows },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("project_id, is_completed, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("notes")
      .select("id, project_id, status, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("note_projects")
      .select("project_id, note:notes(id, status, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("resources")
      .select("project_id, status, is_archived")
      .in("project_id", projectIds),
  ]);

  // Build per-project completion stats matching buildProjectCompletionStats
  // semantics: tasks (any status, !archived), notes (status !== "archive" &&
  // !archived, distinct via project_id OR junction), resources (!archived).
  // "Completed" means task.is_completed, note.status === "saved", or
  // resource.status === "saved".
  const completedByProject = new Map<string, number>();
  const totalByProject = new Map<string, number>();
  const seenNotesByProject = new Map<string, Set<string>>();

  const bump = (projectId: string, done: boolean) => {
    completedByProject.set(projectId, (completedByProject.get(projectId) ?? 0) + (done ? 1 : 0));
    totalByProject.set(projectId, (totalByProject.get(projectId) ?? 0) + 1);
  };

  for (const t of (taskRows ?? []) as Array<{
    project_id: string | null;
    is_completed: boolean;
    is_archived: boolean;
  }>) {
    if (!t.project_id || t.is_archived) continue;
    bump(t.project_id, t.is_completed);
  }

  for (const n of (noteRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!n.project_id || n.is_archived || n.status === "archive") continue;
    const seen = seenNotesByProject.get(n.project_id) ?? new Set<string>();
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    seenNotesByProject.set(n.project_id, seen);
    bump(n.project_id, n.status === "saved");
  }

  for (const link of (noteJunctionRows ?? []) as Array<{
    project_id: string;
    note:
      | { id: string; status: string; is_archived: boolean }
      | { id: string; status: string; is_archived: boolean }[]
      | null;
  }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!note || note.is_archived || note.status === "archive") continue;
    const seen = seenNotesByProject.get(link.project_id) ?? new Set<string>();
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    seenNotesByProject.set(link.project_id, seen);
    bump(link.project_id, note.status === "saved");
  }

  for (const r of (resourceRows ?? []) as Array<{
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!r.project_id || r.is_archived) continue;
    bump(r.project_id, r.status === "saved");
  }

  return projects.map((project) => {
    if (project.status === "completed") {
      return { ...project, progress: 100 };
    }
    const total = totalByProject.get(project.id) ?? 0;
    if (total === 0) {
      // Keep stored progress when there are no items to derive from.
      return { ...project, progress: project.progress ?? 0 };
    }
    const completed = completedByProject.get(project.id) ?? 0;
    return { ...project, progress: Math.round((completed / total) * 100) };
  });
}

async function hydrateProjectRollupCounts(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);
  const supabase = createClient();

  // Collect goal IDs linked to any of these projects so we can filter them by
  // active status (matches every inline `activeGoalIdSet` predicate:
  // !is_completed && !is_archived).
  const linkedGoalIdsByProject = new Map<string, string[]>();
  for (const project of projects) {
    linkedGoalIdsByProject.set(project.id, project.linkedGoalIds ?? []);
  }
  const allGoalIds = Array.from(
    new Set(Array.from(linkedGoalIdsByProject.values()).flat()),
  );

  const [
    activeGoalsResult,
    { data: taskRows },
    taskJunctionResult,
    { data: noteRows },
    { data: noteJunctionRows },
    { data: resourceRows },
  ] = await Promise.all([
    allGoalIds.length > 0
      ? supabase
          .from("goals")
          .select("id, is_completed, is_archived")
          .in("id", allGoalIds)
      : Promise.resolve({ data: [] as Array<{ id: string; is_completed: boolean; is_archived: boolean }> }),
    supabase
      .from("tasks")
      .select("id, project_id, is_completed, is_archived")
      .in("project_id", projectIds),
    // Tasks can also be linked to projects via the `task_projects` junction
    // table (multi-project tasks). Without this fan-out the rollup count
    // misses every task whose primary project_id is NULL or points at a
    // different project than the one being rolled up.
    supabase
      .from("task_projects")
      .select("project_id, task:tasks(id, is_completed, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("notes")
      .select("id, project_id, status, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("note_projects")
      .select("project_id, note:notes(id, status, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("resources")
      .select("project_id, status, is_archived")
      .in("project_id", projectIds),
  ]);

  const activeGoalIdSet = new Set(
    ((activeGoalsResult as { data?: Array<{ id: string; is_completed: boolean; is_archived: boolean }> }).data ?? [])
      .filter((g) => !g.is_completed && !g.is_archived)
      .map((g) => g.id),
  );

  const taskCountByProject = new Map<string, number>();
  const seenTasksByProject = new Map<string, Set<string>>();
  const recordTask = (
    projectId: string,
    taskId: string,
    isCompleted: boolean,
    isArchived: boolean,
  ) => {
    if (isArchived || isCompleted) return;
    const seen = seenTasksByProject.get(projectId) ?? new Set<string>();
    if (seen.has(taskId)) return;
    seen.add(taskId);
    seenTasksByProject.set(projectId, seen);
    taskCountByProject.set(projectId, (taskCountByProject.get(projectId) ?? 0) + 1);
  };
  for (const t of (taskRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    is_completed: boolean;
    is_archived: boolean;
  }>) {
    if (!t.project_id) continue;
    recordTask(t.project_id, t.id, t.is_completed, t.is_archived);
  }
  const taskJunctionRows =
    (taskJunctionResult as {
      data?: Array<{
        project_id: string;
        task:
          | { id: string; is_completed: boolean; is_archived: boolean }
          | { id: string; is_completed: boolean; is_archived: boolean }[]
          | null;
      }>;
    }).data ?? [];
  for (const link of taskJunctionRows) {
    const task = Array.isArray(link.task) ? link.task[0] : link.task;
    if (!task) continue;
    recordTask(link.project_id, task.id, task.is_completed, task.is_archived);
  }

  const noteCountByProject = new Map<string, number>();
  const seenNotesByProject = new Map<string, Set<string>>();
  for (const n of (noteRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!n.project_id || n.is_archived || n.status === "archive" || n.status === "saved") continue;
    const seen = seenNotesByProject.get(n.project_id) ?? new Set<string>();
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    seenNotesByProject.set(n.project_id, seen);
    noteCountByProject.set(n.project_id, (noteCountByProject.get(n.project_id) ?? 0) + 1);
  }
  for (const link of (noteJunctionRows ?? []) as Array<{
    project_id: string;
    note:
      | { id: string; status: string; is_archived: boolean }
      | { id: string; status: string; is_archived: boolean }[]
      | null;
  }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!note || note.is_archived || note.status === "archive" || note.status === "saved") continue;
    const seen = seenNotesByProject.get(link.project_id) ?? new Set<string>();
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    seenNotesByProject.set(link.project_id, seen);
    noteCountByProject.set(
      link.project_id,
      (noteCountByProject.get(link.project_id) ?? 0) + 1,
    );
  }

  const resourceCountByProject = new Map<string, number>();
  for (const r of (resourceRows ?? []) as Array<{
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!r.project_id || r.is_archived || r.status === "saved") continue;
    resourceCountByProject.set(
      r.project_id,
      (resourceCountByProject.get(r.project_id) ?? 0) + 1,
    );
  }

  return projects.map((project) => {
    const goalCount = (linkedGoalIdsByProject.get(project.id) ?? []).filter((id) =>
      activeGoalIdSet.has(id),
    ).length;
    return {
      ...project,
      goalCount,
      taskCount: taskCountByProject.get(project.id) ?? 0,
      noteCount: noteCountByProject.get(project.id) ?? 0,
      resourceCount: resourceCountByProject.get(project.id) ?? 0,
    };
  });
}

async function hydrateProjectRelations(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;
  const withAreas = await hydrateProjectAreaLinks(projects);
  const withGoals = await hydrateProjectGoalLinks(withAreas);
  // Progress + rollup counts depend only on the project IDs, so they can run
  // in parallel with each other once we have linkedGoalIds for the rollups.
  const [withProgress, withRollups] = await Promise.all([
    hydrateProjectProgress(withGoals),
    hydrateProjectRollupCounts(withGoals),
  ]);
  // Merge rollup counts into the progress-hydrated array so we keep both.
  const rollupsById = new Map(withRollups.map((p) => [p.id, p]));
  return withProgress.map((p) => {
    const r = rollupsById.get(p.id);
    if (!r) return p;
    return {
      ...p,
      goalCount: r.goalCount,
      taskCount: r.taskCount,
      noteCount: r.noteCount,
      resourceCount: r.resourceCount,
    };
  });
}

async function hydrateSingleProjectRelations(project: Project): Promise<Project> {
  const [hydrated] = await hydrateProjectRelations([project]);
  return hydrated;
}

function normalizeProject(project: ProjectRecord): Project {
  return {
    ...project,
    slug: project.slug ?? generateSlug(project.name),
  } as Project;
}

function normalizeProjects(projects: ProjectRecord[] | null | undefined): Project[] {
  return (projects ?? []).map((project) => normalizeProject(project));
}

async function runProjectListQuery(
  queryFactory: (selectClause: string) => PromiseLike<ProjectListQueryResult>,
): Promise<Project[]> {
  const result = await queryFactory(PROJECT_SELECT);

  if (isMissingProjectSlugColumnError(result.error)) {
    const legacyResult = await queryFactory(LEGACY_PROJECT_SELECT);
    if (legacyResult.error) {
      throw new DatabaseError(legacyResult.error.message, legacyResult.error);
    }

    return normalizeProjects(legacyResult.data as ProjectRecord[] | null | undefined);
  }

  if (result.error) {
    throw new DatabaseError(result.error.message, result.error);
  }

  return normalizeProjects(result.data as ProjectRecord[] | null | undefined);
}

async function runSingleProjectQuery(
  queryFactory: (selectClause: string) => PromiseLike<ProjectSingleQueryResult>,
  missingEntity: { entity: string; identifier: string },
): Promise<Project> {
  const result = await queryFactory(PROJECT_SELECT);

  if (isMissingProjectSlugColumnError(result.error)) {
    const legacyResult = await queryFactory(LEGACY_PROJECT_SELECT);
    if (legacyResult.error) {
      if (legacyResult.error.code === "PGRST116") {
        throw new NotFoundError(missingEntity.entity, missingEntity.identifier);
      }

      throw new DatabaseError(legacyResult.error.message, legacyResult.error);
    }

    return normalizeProject(legacyResult.data as unknown as ProjectRecord);
  }

  if (result.error) {
    if (result.error.code === "PGRST116") {
      throw new NotFoundError(missingEntity.entity, missingEntity.identifier);
    }

    throw new DatabaseError(result.error.message, result.error);
  }

  return normalizeProject(result.data as unknown as ProjectRecord);
}

async function runWriteProjectQuery(
  queryFactory: (selectClause: string) => PromiseLike<ProjectSingleQueryResult>,
  missingEntity: { entity: string; identifier: string },
): Promise<Project> {
  return runSingleProjectQuery(queryFactory, missingEntity);
}

async function listProjectsForSlugFallback(userId: string): Promise<Project[]> {
  return runProjectListQuery((selectClause) =>
    createClient()
      .from("projects")
      .select(selectClause)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  projectInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...projectInput } = input;

  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    projectInput,
  };
}

export const projectService = {
  async list(
    userId: string,
    filters?: {
      term?: string;
      priority?: string;
      areaId?: string;
      status?: ProjectStatus | "all";
    },
  ): Promise<Project[]> {
    const projects = await runProjectListQuery((selectClause) => {
      let query = createClient()
        .from("projects")
        .select(selectClause)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters?.status === "archived") {
        query = query.eq("is_archived", true);
      } else {
        query = query.eq("is_archived", false);
        if (filters?.status && filters.status !== "all") {
          query = query.eq("status", filters.status);
        }
      }
      if (filters?.areaId) {
        query = query.eq("area_id", filters.areaId);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.term) {
        query = query.ilike("name", `%${filters.term}%`);
      }

      return query;
    });

    return hydrateProjectRelations(projects);
  },

  async getById(userId: string, id: string): Promise<Project> {
    const project = await runSingleProjectQuery(
      (selectClause) =>
        createClient()
          .from("projects")
          .select(selectClause)
          .eq("user_id", userId)
          .eq("id", id)
          .single(),
      { entity: "Project", identifier: id },
    );

    return hydrateSingleProjectRelations(project);
  },

  async getBySlug(userId: string, slug: string): Promise<Project> {
    const result = await createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .single();

    if (isMissingProjectSlugColumnError(result.error)) {
      const projects = await listProjectsForSlugFallback(userId);
      const project = projects.find((candidate) => candidate.slug === slug);

      if (!project) {
        throw new NotFoundError("Project", slug);
      }

      return hydrateSingleProjectRelations(project);
    }

    if (result.error) {
      if (result.error.code === "PGRST116") {
        const projects = await listProjectsForSlugFallback(userId);
        const project = projects.find((candidate) => candidate.slug === slug);

        if (project) {
          return hydrateSingleProjectRelations(project);
        }

        throw new NotFoundError("Project", slug);
      }

      throw new DatabaseError(result.error.message, result.error);
    }

    return hydrateSingleProjectRelations(normalizeProject(result.data as unknown as ProjectRecord));
  },

  async getByIdentifier(userId: string, identifier: string): Promise<Project> {
    if (isUuid(identifier)) {
      return this.getById(userId, identifier);
    }
    return this.getBySlug(userId, identifier);
  },

  async generateUniqueSlug(userId: string, baseSlug: string): Promise<string> {
    const { data, error } = await createClient()
      .from("projects")
      .select("slug")
      .eq("user_id", userId)
      .ilike("slug", `${baseSlug}%`);

    if (error) {
      if (isMissingProjectSlugColumnError(error)) {
        return baseSlug;
      }
      throw new DatabaseError(error.message);
    }

    const existingSlugs = new Set((data ?? []).map((r) => r.slug));
    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 1;
    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix++;
    }
    return `${baseSlug}-${suffix}`;
  },

  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    const validated = createProjectSchema.parse(input);
    const { areaIds, projectInput: areaCleanedInput } = extractProjectAreaIds(validated);
    const { goalIds, projectInput } = extractGoalIds(areaCleanedInput);

    // Status is always derived from context on create so an inbox entity
    // can never be persisted as "planning" (or any non-inbox bucket) just
    // because the caller passed a stale default. The dialog form default
    // for `status` is `PLANNING`, so trusting `validated.status` here
    // would let an empty form (no area/goal, no dates) slip through as
    // planning instead of inbox.
    const status = deriveProjectStatus({
      area_ids: areaIds,
      goal_ids: goalIds,
      start_date: validated.start_date,
      due_date: validated.due_date,
    });

    const baseSlug = generateSlug(validated.name);
    const slug = await this.generateUniqueSlug(userId, baseSlug);

    const project = await runWriteProjectQuery(
      (selectClause) =>
        createClient()
          .from("projects")
          .insert(
            selectClause === PROJECT_SELECT
              ? { ...projectInput, status, user_id: userId, slug }
              : { ...projectInput, status, user_id: userId },
          )
          .select(selectClause)
          .single(),
      { entity: "Project", identifier: validated.name },
    );

    if (areaIds?.length) {
      await this.replaceAreaLinks(userId, project.id, areaIds);
    }

    if (goalIds?.length) {
      await this.replaceGoalLinks(userId, project.id, goalIds);
    }

    return hydrateSingleProjectRelations(project);
  },

  async update(userId: string, id: string, input: UpdateProjectInput): Promise<Project> {
    const validated = updateProjectSchema.parse(input);
    const { areaIds, projectInput: areaCleanedInput } = extractProjectAreaIds(validated);
    const { goalIds, projectInput } = extractGoalIds(areaCleanedInput);
    const hasProjectUpdates = Object.keys(projectInput).length > 0;
    const projectInputWide = projectInput as Record<string, unknown> & {
      status?: ProjectStatus;
    };

    // Re-derive the status whenever the project's context changes. The
    // caller may pass a stale `status` (e.g. the dialog default
    // `planning`) — the context (area/goal + start_date/due_date) is the
    // source of truth for the inbox/planning split, and a stale bucket
    // should be corrected.
    //
    // User-picked states (active, completed, on_hold) are preserved: once
    // a project has been moved into a workflow state, inbox/planning logic
    // no longer applies.
    const updateInput = projectInput as {
      start_date?: string | null;
      due_date?: string | null;
    };
    const datesChanged =
      updateInput.start_date !== undefined || updateInput.due_date !== undefined;
    const touchesContext =
      areaIds !== undefined || goalIds !== undefined || datesChanged;
    const preservesTerminal =
      projectInputWide.status === PROJECT_STATUS.ACTIVE ||
      projectInputWide.status === PROJECT_STATUS.COMPLETED ||
      projectInputWide.status === PROJECT_STATUS.ON_HOLD;

    if (touchesContext && !preservesTerminal) {
      const derived = deriveProjectStatus({
        area_ids: areaIds,
        goal_ids: goalIds,
        start_date: updateInput.start_date ?? validated.start_date,
        due_date: updateInput.due_date ?? validated.due_date,
      });
      if (derived !== projectInputWide.status) {
        projectInputWide.status = derived;
      }
    }

    const project = hasProjectUpdates
      ? await runWriteProjectQuery(
          (selectClause) =>
            createClient()
              .from("projects")
              .update(projectInput)
              .eq("user_id", userId)
              .eq("id", id)
              .select(selectClause)
              .single(),
          { entity: "Project", identifier: id },
        )
      : await this.getById(userId, id);

    if (areaIds !== undefined) {
      await this.replaceAreaLinks(userId, id, areaIds);
    }

    if (goalIds !== undefined) {
      await this.replaceGoalLinks(userId, id, goalIds);
    }

    return hydrateSingleProjectRelations(project);
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async archive(userId: string, id: string): Promise<Project> {
    const project = await runWriteProjectQuery(
      (selectClause) =>
        createClient()
          .from("projects")
          .update({ is_archived: true })
          .eq("user_id", userId)
          .eq("id", id)
          .select(selectClause)
          .single(),
      { entity: "Project", identifier: id },
    );

    return hydrateSingleProjectRelations(project);
  },

  async restore(userId: string, id: string): Promise<Project> {
    const project = await runWriteProjectQuery(
      (selectClause) =>
        createClient()
          .from("projects")
          .update({ is_archived: false })
          .eq("user_id", userId)
          .eq("id", id)
          .select(selectClause)
          .single(),
      { entity: "Project", identifier: id },
    );

    return hydrateSingleProjectRelations(project);
  },

  async listByStatus(
    userId: string | undefined,
    status: ProjectStatus | "all",
  ): Promise<Project[]> {
    const projects = await runProjectListQuery((selectClause) => {
      let query = createClient()
        .from("projects")
        .select(selectClause)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (status === "archived") {
        query = query.eq("is_archived", true);
      } else {
        query = query.eq("is_archived", false);
        if (status !== "all") {
          query = query.eq("status", status);
        }
      }

      return query;
    });

    return hydrateProjectRelations(projects);
  },

  async listByArea(userId: string | undefined, areaId: string): Promise<Project[]> {
    const projects = await runProjectListQuery((selectClause) =>
      createClient()
        .from("projects")
        .select(selectClause)
        .eq("user_id", userId!)
        .eq("area_id", areaId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false }),
    );

    return hydrateProjectRelations(projects);
  },

  async getWithRelations(userId: string, id: string): Promise<{
    goal_ids: string[];
    area_ids: string[];
    goals: { id: string; name: string }[];
  }> {
    const [goalResult, areaResult] = await Promise.all([
      createClient().from("goal_projects").select("goal_id, goals(id, name)").eq("project_id", id),
      createClient().from("project_areas").select("area_id").eq("project_id", id),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    const goalRows = goalResult.data ?? [];
    const goals = goalRows
      .map((r) => r.goals as unknown as { id: string; name: string } | null)
      .filter((g): g is { id: string; name: string } => Boolean(g));

    if (areaResult.error) {
      if (isMissingProjectAreasTableError(areaResult.error)) {
        return { goal_ids: goalRows.map((r) => r.goal_id), area_ids: [], goals };
      }
      throw new DatabaseError(areaResult.error.message);
    }

    return {
      goal_ids: goalRows.map((r) => r.goal_id),
      area_ids: areaResult.data?.map((r) => r.area_id) || [],
      goals,
    };
  },

  async replaceAreaLinks(userId: string, projectId: string, areaIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(userId, projectId);
    const existingAreaIds = new Set(existingRelations.area_ids);
    const nextAreaIds = new Set(areaIds);
    const areaIdsToAdd = areaIds.filter((areaId) => !existingAreaIds.has(areaId));
    const areaIdsToRemove = existingRelations.area_ids.filter((areaId) => !nextAreaIds.has(areaId));

    if (areaIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("project_areas")
        .insert(areaIdsToAdd.map((area_id) => ({ area_id, project_id: projectId })));

      if (error && !isMissingProjectAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (areaIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("project_areas")
        .delete()
        .eq("project_id", projectId)
        .in("area_id", areaIdsToRemove);

      if (error && !isMissingProjectAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    const primaryAreaId = areaIds[0] ?? null;
    if (primaryAreaId !== undefined) {
      // Keep `projects.area_id` in sync AND re-derive the project status from
      // the new context so linking/unlinking an area flips an inbox project to
      // planning (and back) without going through the full update() path.
      const { data: currentProject, error: fetchError } = await createClient()
        .from("projects")
        .select("status, start_date, due_date")
        .eq("id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        throw new DatabaseError(fetchError.message);
      }

      const updatePayload: { area_id: string | null; status?: ProjectStatus } = {
        area_id: primaryAreaId,
      };
      if (currentProject) {
        // Preserve user-picked workflow states — linking a new area to an
        // already-active project should not flip it back to planning/inbox.
        const terminalStatus =
          currentProject.status === PROJECT_STATUS.ACTIVE ||
          currentProject.status === PROJECT_STATUS.COMPLETED ||
          currentProject.status === PROJECT_STATUS.ON_HOLD;
        if (!terminalStatus) {
          const derived = deriveProjectStatus({
            area_id: primaryAreaId,
            area_ids: areaIds,
            goal_ids: existingRelations.goal_ids,
            start_date: currentProject.start_date,
            due_date: currentProject.due_date,
          });
          if (derived !== currentProject.status) {
            updatePayload.status = derived;
          }
        }
      }

      const { error } = await createClient()
        .from("projects")
        .update(updatePayload)
        .eq("id", projectId)
        .eq("user_id", userId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async linkToArea(userId: string, projectId: string, areaId: string): Promise<void> {
    const existingRelations = await this.getWithRelations(userId, projectId);
    if (existingRelations.area_ids.includes(areaId)) {
      return;
    }

    await this.replaceAreaLinks(userId, projectId, [...existingRelations.area_ids, areaId]);
  },

  async unlinkFromArea(userId: string, projectId: string, areaId: string): Promise<void> {
    const existingRelations = await this.getWithRelations(userId, projectId);
    const nextAreaIds = existingRelations.area_ids.filter((linkedAreaId) => linkedAreaId !== areaId);
    await this.replaceAreaLinks(userId, projectId, nextAreaIds);
  },

  async replaceGoalLinks(userId: string, projectId: string, goalIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(userId, projectId);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_projects")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, project_id: projectId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_projects")
        .delete()
        .eq("project_id", projectId)
        .in("goal_id", goalIdsToRemove);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    // Re-derive status from the new goal context (plus any existing area
    // context) so linking/unlinking a goal flips the status appropriately.
    const { data: currentProject, error: fetchError } = await createClient()
      .from("projects")
      .select("status, area_id, start_date, due_date")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      throw new DatabaseError(fetchError.message);
    }

    if (!currentProject) return;

    // Preserve user-picked workflow states.
    const terminalStatus =
      currentProject.status === PROJECT_STATUS.ACTIVE ||
      currentProject.status === PROJECT_STATUS.COMPLETED ||
      currentProject.status === PROJECT_STATUS.ON_HOLD;
    if (terminalStatus) return;

    const derivedStatus = deriveProjectStatus({
      area_id: currentProject.area_id,
      area_ids: existingRelations.area_ids,
      goal_ids: goalIds,
      start_date: currentProject.start_date,
      due_date: currentProject.due_date,
    });

    if (derivedStatus !== currentProject.status) {
      const { error } = await createClient()
        .from("projects")
        .update({ status: derivedStatus })
        .eq("id", projectId)
        .eq("user_id", userId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async linkToGoal(userId: string, projectId: string, goalId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_projects")
      .insert({ project_id: projectId, goal_id: goalId });

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncProjectStatusFromContext(userId, projectId);
  },

  async unlinkFromGoal(userId: string, projectId: string, goalId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_projects")
      .delete()
      .eq("project_id", projectId)
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncProjectStatusFromContext(userId, projectId);
  },

  /**
   * Re-reads the project's current area + goal + dates context, derives
   * the expected status, and writes it back if it differs. Used by
   * bypass link/unlink actions that mutate junction tables without going
   * through the full `update()` path.
   *
   * User-picked states (active, completed, on_hold) are preserved: a
   * project that's been moved into a workflow state is not pulled back
   * to inbox/planning by a later link/unlink.
   */
  async syncProjectStatusFromContext(userId: string, projectId: string): Promise<void> {
    const relations = await this.getWithRelations(userId, projectId);
    const { data: currentProject, error: fetchError } = await createClient()
      .from("projects")
      .select("status, area_id, start_date, due_date")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      throw new DatabaseError(fetchError.message);
    }
    if (!currentProject) return;

    if (
      currentProject.status === PROJECT_STATUS.ACTIVE ||
      currentProject.status === PROJECT_STATUS.COMPLETED ||
      currentProject.status === PROJECT_STATUS.ON_HOLD
    ) {
      return;
    }

    const derivedStatus = deriveProjectStatus({
      area_id: currentProject.area_id,
      area_ids: relations.area_ids,
      goal_ids: relations.goal_ids,
      start_date: currentProject.start_date,
      due_date: currentProject.due_date,
    });

    if (derivedStatus !== currentProject.status) {
      const { error } = await createClient()
        .from("projects")
        .update({ status: derivedStatus })
        .eq("id", projectId)
        .eq("user_id", userId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async listByGoal(userId: string, goalId: string): Promise<Project[]> {
    const { data, error } = await createClient()
      .from("goal_projects")
      .select("project:projects(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const projects = normalizeProjects(
      (data ?? [])
        .map((r) => r.project as unknown as ProjectRecord | null)
        .filter((project): project is ProjectRecord => Boolean(project)),
    );

    return hydrateProjectRelations(projects);
  },

  /**
   * One-shot backfill: re-derive status for every non-terminal project
   * whose stored status does not match the value derived from its
   * current area/goal + dates context. Terminal states (active,
   * completed, on_hold) are preserved.
   */
  async backfillStaleStatuses(userId: string): Promise<number> {
    const { data, error } = await createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .neq("status", PROJECT_STATUS.ACTIVE)
      .neq("status", PROJECT_STATUS.COMPLETED)
      .neq("status", PROJECT_STATUS.ON_HOLD);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const projects = (data ?? []) as unknown as Project[];
    let fixed = 0;
    for (const project of projects) {
      const relations = await this.getWithRelations(userId, project.id);
      const derived = deriveProjectStatus({
        area_id: project.area_id,
        area_ids: relations.area_ids,
        goal_ids: relations.goal_ids,
        start_date: project.start_date,
        due_date: project.due_date,
      });
      if (derived !== project.status) {
        const { error: updateError } = await createClient()
          .from("projects")
          .update({ status: derived })
          .eq("id", project.id)
          .eq("user_id", userId);
        if (updateError) {
          throw new DatabaseError(updateError.message);
        }
        fixed += 1;
      }
    }

    return fixed;
  },
};
