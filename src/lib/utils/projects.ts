import type { Project, Task } from "@/lib/types/domain.types";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/utils/constants";

export const PROJECT_VIEW = {
  ALL: "all",
  INBOX: "inbox",
  IN_PROGRESS: "in-progress",
  BY_AREA: "by-area",
  BY_STATUS: "by-status",
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
    case PROJECT_VIEW.IN_PROGRESS:
      return { includeArchived: false, status: PROJECT_STATUS.ACTIVE };
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

  return PROJECT_VIEW.ALL;
}

export function groupProjectsByStatus(projects: Project[]): Record<ProjectStatus, Project[]> {
  return projects.reduce<Record<ProjectStatus, Project[]>>(
    (groups, project) => {
      groups[project.status].push(project);
      return groups;
    },
    {
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
    if (!task.project_id || task.is_archived) {
      continue;
    }

    const current = stats.get(task.project_id) ?? { completed: 0, total: 0 };
    const nextStats = {
      completed: current.completed + (task.is_completed ? 1 : 0),
      total: current.total + 1,
    };

    stats.set(task.project_id, nextStats);
  }

  return stats;
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
