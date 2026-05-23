import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import { noteMatchesAreaId } from "@/lib/utils/notes";
import { projectMatchesAreaId } from "@/lib/utils/projects";
import { taskMatchesAreaId } from "@/lib/utils/tasks";

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
}

const ACTIVE_NOTE_STATUSES: Set<string> = new Set([NOTE_STATUS.INBOX, NOTE_STATUS.TO_REVIEW, NOTE_STATUS.ACTIVE]);
const ACTIVE_RESOURCE_STATUSES: Set<string> = new Set([RESOURCE_STATUS.INBOX, RESOURCE_STATUS.TO_REVIEW, RESOURCE_STATUS.ACTIVE]);

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

/**
 * Returns true when an area should appear in the inactive tab:
 * either explicitly marked inactive, or all active rollup counts are zero.
 */
export function isAreaEffectivelyInactive(
  area: Pick<Area, "archive" | "inactive">,
  rollups?: AreaRollups,
): boolean {
  if (area.archive) return false;
  if (area.inactive) return true;
  if (!rollups) return false;
  return (
    rollups.goalsCount === 0 &&
    rollups.projectsCount === 0 &&
    rollups.tasksCount === 0 &&
    rollups.notesCount === 0 &&
    rollups.resourcesCount === 0
  );
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

/**
 * Returns the linked area IDs for a resource, falling back to the primary
 * `area_id` when the optional `linkedAreaIds` array isn't hydrated.
 */
function getResourceLinkedAreaIds(resource: Resource): string[] {
  if (resource.linkedAreaIds && resource.linkedAreaIds.length > 0) {
    return resource.linkedAreaIds;
  }
  return resource.area_id ? [resource.area_id] : [];
}

function resourceMatchesAreaId(resource: Resource, areaId: string): boolean {
  return getResourceLinkedAreaIds(resource).includes(areaId);
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
      (project) =>
        projectMatchesAreaId(project, areaId) &&
        !project.is_archived &&
        project.status !== "completed",
    ).length,
    tasksCount: tasks.filter(
      (task) =>
        taskMatchesAreaId(task, areaId) && !task.is_archived && !task.is_completed,
    ).length,
    notesCount: notes.filter(
      (note) =>
        noteMatchesAreaId(note, areaId) &&
        !note.is_archived &&
        ACTIVE_NOTE_STATUSES.has(note.status),
    ).length,
    resourcesCount: resources.filter(
      (resource) =>
        resourceMatchesAreaId(resource, areaId) &&
        !resource.is_archived &&
        ACTIVE_RESOURCE_STATUSES.has(resource.status),
    ).length,
  };
}
