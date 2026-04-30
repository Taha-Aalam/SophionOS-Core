import { createClient } from "../supabase/client";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../types/domain.types";
import { createProjectSchema, updateProjectSchema } from "../validators/project.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { generateSlug } from "../utils";
import type { ProjectStatus } from "../utils/constants";

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

async function hydrateSingleProjectAreaLinks(project: Project): Promise<Project> {
  const [hydratedProject] = await hydrateProjectAreaLinks([project]);
  return hydratedProject;
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

    return hydrateProjectAreaLinks(projects);
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

    return hydrateSingleProjectAreaLinks(project);
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

      return hydrateSingleProjectAreaLinks(project);
    }

    if (result.error) {
      if (result.error.code === "PGRST116") {
        const projects = await listProjectsForSlugFallback(userId);
        const project = projects.find((candidate) => candidate.slug === slug);

        if (project) {
          return hydrateSingleProjectAreaLinks(project);
        }

        throw new NotFoundError("Project", slug);
      }

      throw new DatabaseError(result.error.message, result.error);
    }

    return hydrateSingleProjectAreaLinks(normalizeProject(result.data as unknown as ProjectRecord));
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

    const baseSlug = generateSlug(validated.name);
    const slug = await this.generateUniqueSlug(userId, baseSlug);

    const project = await runWriteProjectQuery(
      (selectClause) =>
        createClient()
          .from("projects")
          .insert(
            selectClause === PROJECT_SELECT
              ? { ...projectInput, user_id: userId, slug }
              : { ...projectInput, user_id: userId },
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

    return hydrateSingleProjectAreaLinks(project);
  },

  async update(userId: string, id: string, input: UpdateProjectInput): Promise<Project> {
    const validated = updateProjectSchema.parse(input);
    const { areaIds, projectInput: areaCleanedInput } = extractProjectAreaIds(validated);
    const { goalIds, projectInput } = extractGoalIds(areaCleanedInput);
    const hasProjectUpdates = Object.keys(projectInput).length > 0;

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

    if (goalIds) {
      await this.replaceGoalLinks(userId, id, goalIds);
    }

    return hydrateSingleProjectAreaLinks(project);
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

    return hydrateSingleProjectAreaLinks(project);
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

    return hydrateProjectAreaLinks(projects);
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

    return hydrateProjectAreaLinks(projects);
  },

  async getWithRelations(userId: string, id: string): Promise<{
    goal_ids: string[];
    area_ids: string[];
  }> {
    const [goalResult, areaResult] = await Promise.all([
      createClient().from("goal_projects").select("goal_id").eq("project_id", id),
      createClient().from("project_areas").select("area_id").eq("project_id", id),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    if (areaResult.error) {
      if (isMissingProjectAreasTableError(areaResult.error)) {
        return { goal_ids: goalResult.data?.map((r) => r.goal_id) || [], area_ids: [] };
      }
      throw new DatabaseError(areaResult.error.message);
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
      area_ids: areaResult.data?.map((r) => r.area_id) || [],
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
      const { error } = await createClient()
        .from("projects")
        .update({ area_id: primaryAreaId })
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
  },

  async linkToGoal(userId: string, projectId: string, goalId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_projects")
      .insert({ project_id: projectId, goal_id: goalId });

    if (error) {
      throw new DatabaseError(error.message);
    }
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

    return hydrateProjectAreaLinks(projects);
  },
};
