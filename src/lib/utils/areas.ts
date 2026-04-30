import type { Area, Goal, Note, Project, Task } from "@/lib/types/domain.types";
import { goalMatchesAreaId } from "@/lib/utils/goals";

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
}

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
}): AreaRollups {
  const { areaId, goals, projects, tasks, notes = [] } = params;

  return {
    goalsCount: goals.filter((goal) => goalMatchesAreaId(goal, areaId) && !goal.is_archived)
      .length,
    projectsCount: projects.filter((project) => project.area_id === areaId && !project.is_archived)
      .length,
    tasksCount: tasks.filter(
      (task) => task.area_id === areaId && !task.is_archived && !task.is_completed,
    ).length,
    notesCount: notes.filter((note) => note.area_id === areaId && !note.is_archived).length,
  };
}
