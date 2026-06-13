import type { Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, type ProjectStatus } from "@/lib/utils/constants";

type ProjectWithAreaLinks = Pick<Project, "area_id"> & { linkedAreaIds?: string[] };

export function getProjectLinkedAreaIds(project: ProjectWithAreaLinks): string[] {
  const linkedAreaIds = project.linkedAreaIds ?? [];
  const nextAreaIds = project.area_id ? [project.area_id, ...linkedAreaIds] : linkedAreaIds;

  return Array.from(new Set(nextAreaIds.filter(Boolean)));
}

export function projectMatchesAreaId(project: ProjectWithAreaLinks, areaId?: string): boolean {
  if (!areaId) {
    return true;
  }

  return getProjectLinkedAreaIds(project).includes(areaId);
}

export const PROJECT_VIEW = {
  ALL: "all",
  INBOX: "inbox",
  PLANNING: "planning",
  IN_PROGRESS: "in-progress",
  ON_HOLD: "on-hold",
  COMPLETED: "completed",
  BY_STATUS: "by-status",
  BY_AREA: "by-area",
  BY_GOAL: "by-goal",
  ARCHIVE: "archive",
} as const;

export type ProjectView = (typeof PROJECT_VIEW)[keyof typeof PROJECT_VIEW];

export interface ProjectTaskStats {
  completed: number;
  total: number;
}

export interface ProjectDueState {
  isOverdue: boolean;
  isToday: boolean;
  label: string;
  tone: "default" | "muted" | "warning";
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case PROJECT_STATUS.PLANNING:
      return "Planning";
    case PROJECT_STATUS.ACTIVE:
      return "In Progress";
    case PROJECT_STATUS.COMPLETED:
      return "Completed";
    case PROJECT_STATUS.ON_HOLD:
      return "On Hold";
    case PROJECT_STATUS.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function getProjectFiltersForView(view: ProjectView): {
  includeArchived: boolean;
  status?: ProjectStatus;
} {
  switch (view) {
    case PROJECT_VIEW.INBOX:
      return { includeArchived: false, status: PROJECT_STATUS.PLANNING };
    case PROJECT_VIEW.PLANNING:
      return { includeArchived: false, status: PROJECT_STATUS.PLANNING };
    case PROJECT_VIEW.IN_PROGRESS:
      return { includeArchived: false, status: PROJECT_STATUS.ACTIVE };
    case PROJECT_VIEW.ON_HOLD:
      return { includeArchived: false, status: PROJECT_STATUS.ON_HOLD };
    case PROJECT_VIEW.COMPLETED:
      return { includeArchived: false, status: PROJECT_STATUS.COMPLETED };
    case PROJECT_VIEW.ARCHIVE:
      return { includeArchived: true };
    default:
      return { includeArchived: false };
  }
}

export function getProjectViewFromFilters(filters: {
  includeArchived?: boolean;
  status?: ProjectStatus;
}): ProjectView {
  if (filters.includeArchived) {
    return PROJECT_VIEW.ARCHIVE;
  }

  if (filters.status === PROJECT_STATUS.PLANNING) {
    return PROJECT_VIEW.INBOX;
  }

  if (filters.status === PROJECT_STATUS.ACTIVE) {
    return PROJECT_VIEW.IN_PROGRESS;
  }

  if (filters.status === PROJECT_STATUS.COMPLETED) {
    return PROJECT_VIEW.COMPLETED;
  }

  if (filters.status === PROJECT_STATUS.ON_HOLD) {
    return PROJECT_VIEW.ON_HOLD;
  }

  return PROJECT_VIEW.ALL;
}

export function groupProjectsByStatus(projects: Project[]): Record<ProjectStatus, Project[]> {
  return projects.reduce<Record<ProjectStatus, Project[]>>(
    (groups, project) => {
      groups[project.status].push(project);
      return groups;
    },
    {
      [PROJECT_STATUS.INBOX]: [],
      [PROJECT_STATUS.PLANNING]: [],
      [PROJECT_STATUS.ACTIVE]: [],
      [PROJECT_STATUS.COMPLETED]: [],
      [PROJECT_STATUS.ON_HOLD]: [],
      [PROJECT_STATUS.ARCHIVED]: [],
    },
  );
}

export function groupProjectsByArea(projects: Project[]): Record<string, Project[]> {
  return projects.reduce<Record<string, Project[]>>((groups, project) => {
    const areaId = project.area_id ?? "unassigned";
    const nextGroup = groups[areaId] ?? [];

    nextGroup.push(project);
    groups[areaId] = nextGroup;

    return groups;
  }, {});
}

export function mergeProjectQueryResults(
  activeProjects: Project[],
  archivedProjects: Project[],
): Project[] {
  const projectsById = new Map<string, Project>();

  for (const project of [...activeProjects, ...archivedProjects]) {
    projectsById.set(project.id, project);
  }

  return Array.from(projectsById.values());
}

export function buildProjectTaskStats(tasks: Task[]): Map<string, ProjectTaskStats> {
  const stats = new Map<string, ProjectTaskStats>();

  for (const task of tasks) {
    if (task.is_archived) continue;
    const projectIds = new Set<string>();
    if (task.project_id) projectIds.add(task.project_id);
    for (const pid of task.linkedProjectIds ?? []) projectIds.add(pid);
    if (projectIds.size === 0) continue;

    for (const pid of projectIds) {
      const current = stats.get(pid) ?? { completed: 0, total: 0 };
      stats.set(pid, {
        completed: current.completed + (task.is_completed ? 1 : 0),
        total: current.total + 1,
      });
    }
  }

  return stats;
}

export function buildProjectCompletionStats(
  tasks: Task[],
  notes: Note[],
  resources: Resource[],
): Map<string, ProjectTaskStats> {
  const stats = new Map<string, ProjectTaskStats>();

  const bump = (projectId: string, done: boolean) => {
    const cur = stats.get(projectId) ?? { completed: 0, total: 0 };
    stats.set(projectId, {
      completed: cur.completed + (done ? 1 : 0),
      total: cur.total + 1,
    });
  };

  for (const task of tasks) {
    if (task.is_archived) continue;
    const projectIds = new Set<string>();
    if (task.project_id) projectIds.add(task.project_id);
    for (const pid of task.linkedProjectIds ?? []) projectIds.add(pid);
    for (const pid of projectIds) {
      bump(pid, task.is_completed);
    }
  }

  for (const note of notes) {
    if (note.is_archived || note.status === NOTE_STATUS.ARCHIVE) continue;
    const projectIds = new Set<string>();
    if (note.project_id) projectIds.add(note.project_id);
    for (const pid of note.linkedProjectIds ?? []) projectIds.add(pid);
    for (const pid of projectIds) {
      bump(pid, note.status === NOTE_STATUS.COMPLETED);
    }
  }

  for (const resource of resources) {
    if (resource.is_archived) continue;
    const projectIds = new Set<string>();
    for (const pid of resource.linkedProjectIds ?? []) projectIds.add(pid);
    if (projectIds.size === 0) continue;
    for (const pid of projectIds) {
      bump(pid, resource.status === RESOURCE_STATUS.COMPLETED);
    }
  }

  return stats;
}

export function groupProjectsByGoal(
  projects: Project[],
): Record<string, Project[]> {
  const result: Record<string, Project[]> = {};

  for (const project of projects) {
    const goalIds = project.linkedGoalIds ?? [];
    if (goalIds.length === 0) {
      const current = result["unassigned"] ?? [];
      current.push(project);
      result["unassigned"] = current;
    } else {
      for (const goalId of goalIds) {
        const current = result[goalId] ?? [];
        current.push(project);
        result[goalId] = current;
      }
    }
  }

  return result;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getProjectDueState(dueDate: string | null): ProjectDueState {
  if (!dueDate) {
    return {
      isOverdue: false,
      isToday: false,
      label: "No due date",
      tone: "muted",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = parseDateOnly(dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      isOverdue: true,
      isToday: false,
      label: "Overdue",
      tone: "warning",
    };
  }

  if (diffDays === 0) {
    return {
      isOverdue: false,
      isToday: true,
      label: "Due today",
      tone: "default",
    };
  }

  return {
    isOverdue: false,
    isToday: false,
    label: diffDays === 1 ? "1 day left" : `${diffDays}d left`,
    tone: "default",
  };
}
