import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import { noteMatchesAreaId } from "@/lib/utils/notes";

export type AreaStatus = "active" | "inactive" | "archived";

export interface GroupedAreas {
  type: string;
  areas: Area[];
}

export interface AreaRollups {
  goalsCount: number;
  projectsCount: number;
  tasksCount: number;
  notesCount: number;
  resourcesCount: number;
  progress?: AreaProgress;
}

export interface AreaProgress {
  completed: number;
  total: number;
  percentage: number;
}

const ACTIVE_NOTE_STATUSES = new Set([NOTE_STATUS.INBOX, NOTE_STATUS.TO_REVIEW, NOTE_STATUS.ACTIVE]);
const ACTIVE_RESOURCE_STATUSES = new Set([RESOURCE_STATUS.INBOX, RESOURCE_STATUS.TO_REVIEW, RESOURCE_STATUS.ACTIVE]);

export function normalizeAreaType(type: string | null | undefined): string {
  const value = type?.trim();

  if (!value) {
    return "Personal";
  }

  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function classifyAreaStatus(area: Pick<Area, "archive" | "inactive">): AreaStatus {
  if (area.archive) {
    return "archived";
  }

  return area.inactive ? "inactive" : "active";
}

export function groupAreasByType(areas: Area[]): GroupedAreas[] {
  const groupedAreas = new Map<string, Area[]>();

  for (const area of areas) {
    if (area.archive) {
      continue;
    }

    const normalizedType = normalizeAreaType(area.type);
    const nextArea = area.type === normalizedType ? area : { ...area, type: normalizedType };
    const existingAreas = groupedAreas.get(normalizedType) ?? [];
    existingAreas.push(nextArea);
    groupedAreas.set(normalizedType, existingAreas);
  }

  return Array.from(groupedAreas.entries())
    .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
    .map(([type, grouped]) => ({
      type,
      areas: grouped.sort((leftArea, rightArea) => leftArea.name.localeCompare(rightArea.name)),
    }));
}

export function getSuggestedAreaTypes(areas: Area[]): string[] {
  const defaultTypes = ["Business", "Personal", "Studies"];
  const customTypes = areas.map((area) => normalizeAreaType(area.type));

  return Array.from(new Set([...defaultTypes, ...customTypes])).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function getAreaRollups(params: {
  areaId: string;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes?: Note[];
  resources?: Resource[];
}): AreaRollups {
  const { areaId, goals, projects, tasks, notes = [], resources = [] } = params;

  return {
    goalsCount: goals.filter(
      (goal) => goalMatchesAreaId(goal, areaId) && !goal.is_archived && !goal.is_completed,
    ).length,
    projectsCount: projects.filter(
      (project) => project.area_id === areaId && !project.is_archived && project.status !== "completed",
    ).length,
    tasksCount: tasks.filter(
      (task) => task.area_id === areaId && !task.is_archived && !task.is_completed,
    ).length,
    notesCount: notes.filter(
      (note) =>
        noteMatchesAreaId(note, areaId) &&
        !note.is_archived &&
        ACTIVE_NOTE_STATUSES.has(note.status as typeof NOTE_STATUS[keyof typeof NOTE_STATUS]),
    ).length,
    resourcesCount: resources.filter(
      (resource) =>
        resource.area_id === areaId &&
        !resource.is_archived &&
        ACTIVE_RESOURCE_STATUSES.has(resource.status as typeof RESOURCE_STATUS[keyof typeof RESOURCE_STATUS]),
    ).length,
    progress: getAreaProgress(params),
  };
}

export function getAreaProgress(params: {
  areaId: string;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes?: Note[];
  resources?: Resource[];
}): AreaProgress {
  const { areaId, goals, projects, tasks, notes = [], resources = [] } = params;

  const areaGoals = goals.filter((g) => goalMatchesAreaId(g, areaId) && !g.is_archived);
  const areaProjects = projects.filter((p) => p.area_id === areaId && !p.is_archived);
  const areaTasks = tasks.filter((t) => t.area_id === areaId && !t.is_archived);
  const areaNotes = notes.filter(
    (n) =>
      noteMatchesAreaId(n, areaId) &&
      !n.is_archived &&
      n.status !== NOTE_STATUS.ARCHIVE,
  );
  const areaResources = resources.filter(
    (r) => r.area_id === areaId && !r.is_archived,
  );

  const total =
    areaGoals.length +
    areaProjects.length +
    areaTasks.length +
    areaNotes.length +
    areaResources.length;

  if (total === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed =
    areaGoals.filter((g) => g.is_completed).length +
    areaProjects.filter((p) => p.status === "completed").length +
    areaTasks.filter((t) => t.is_completed).length +
    areaNotes.filter((n) => n.status === NOTE_STATUS.SAVED).length +
    areaResources.filter((r) => r.status === RESOURCE_STATUS.SAVED).length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
