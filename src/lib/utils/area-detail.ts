import type { Area, Contact, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import type { ContactCategorySection, FollowUpSection } from "@/lib/utils/contact-category-sections";
import {
  buildAreaSections,
  buildFollowUpSections,
  buildGoalSections,
  buildGroupSections,
  buildProjectSections,
} from "@/lib/utils/contact-category-sections";
import { PROJECT_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { getTaskLinkedGoalIds, getTaskLinkedProjectIds } from "@/lib/utils/tasks";
import type { TaskGroup } from "@/components/views/tasks-by-group-view";

// ── project tab filter ───────────────────────────────────────────────────────

export type AreaProjectTab =
  | "all"
  | "inbox"
  | "planning"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "archived";

export function getFilteredAreaProjects(projects: Project[], tab: AreaProjectTab): Project[] {
  if (tab === "archived") return projects.filter((project) => project.is_archived);
  const activeProjects = projects.filter((project) => !project.is_archived);
  if (tab === "all") return activeProjects;
  if (tab === "inbox") return activeProjects.filter((project) => project.status === PROJECT_STATUS.INBOX);
  if (tab === "planning") return activeProjects.filter((project) => project.status === PROJECT_STATUS.PLANNING);
  if (tab === "in_progress") return activeProjects.filter((project) => project.status === PROJECT_STATUS.ACTIVE);
  if (tab === "on_hold") return activeProjects.filter((project) => project.status === PROJECT_STATUS.ON_HOLD);
  if (tab === "completed") return activeProjects.filter((project) => project.status === PROJECT_STATUS.COMPLETED);
  return activeProjects;
}

// ── note tab filter ──────────────────────────────────────────────────────────

export function getFilteredAreaNotes(notes: Note[], tab: string): Note[] {
  if (tab === "archived") return notes.filter((note) => note.is_archived);
  const activeNotes = notes.filter((note) => !note.is_archived);
  if (tab === "inbox") return activeNotes.filter((note) => note.status === "inbox");
  if (tab === "to_review") return activeNotes.filter((note) => note.status === "to_review");
  if (tab === "active") return activeNotes.filter((note) => note.status === "active");
  if (tab === "completed") return activeNotes.filter((note) => note.status === "completed");
  return activeNotes;
}

// ── resource tab filter ──────────────────────────────────────────────────────

export function getFilteredAreaResources(resources: Resource[], tab: string): Resource[] {
  if (tab === "archived") return resources.filter((resource) => resource.is_archived);
  const activeResources = resources.filter((resource) => !resource.is_archived);
  if (tab === "inbox") return activeResources.filter((resource) => resource.status === RESOURCE_STATUS.INBOX);
  if (tab === "to_review") return activeResources.filter((resource) => resource.status === RESOURCE_STATUS.TO_REVIEW);
  if (tab === "active") return activeResources.filter((resource) => resource.status === RESOURCE_STATUS.ACTIVE);
  if (tab === "completed") return activeResources.filter((resource) => resource.status === RESOURCE_STATUS.COMPLETED);
  return activeResources;
}

// ── task grouped views ───────────────────────────────────────────────────────

export function buildAreaTaskGroupsByGoal(tasks: Task[], goals: Goal[]): TaskGroup[] {
  const goalMap = new Map(goals.map((g) => [g.id, g.name]));
  const grouped = new Map<string, Task[]>();

  for (const task of tasks) {
    const ids = getTaskLinkedGoalIds(task);
    if (ids.length === 0) {
      const current = grouped.get("unassigned") ?? [];
      current.push(task);
      grouped.set("unassigned", current);
    } else {
      for (const goalId of ids) {
        const current = grouped.get(goalId) ?? [];
        current.push(task);
        grouped.set(goalId, current);
      }
    }
  }

  return Array.from(grouped.entries()).map(([goalId, groupTasks]) => ({
    groupId: goalId,
    groupName: goalId === "unassigned" ? "No Goal" : (goalMap.get(goalId) ?? goalId),
    tasks: groupTasks,
  }));
}

export function buildAreaTaskGroupsByProject(tasks: Task[], projects: Project[]): TaskGroup[] {
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const grouped = new Map<string, Task[]>();

  for (const task of tasks) {
    const ids = getTaskLinkedProjectIds(task);
    if (ids.length === 0) {
      const current = grouped.get("unassigned") ?? [];
      current.push(task);
      grouped.set("unassigned", current);
    } else {
      for (const projectId of ids) {
        const current = grouped.get(projectId) ?? [];
        current.push(task);
        grouped.set(projectId, current);
      }
    }
  }

  return Array.from(grouped.entries()).map(([projectId, groupTasks]) => ({
    groupId: projectId,
    groupName: projectId === "unassigned" ? "No Project" : (projectMap.get(projectId) ?? projectId),
    tasks: groupTasks,
  }));
}

// ── contact category sections ────────────────────────────────────────────────

export function buildAreaContactGoalSections(contacts: Contact[], goals: Goal[]): ContactCategorySection[] {
  const unassigned: Contact[] = [];
  const grouped = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const ids = contact.linkedGoalIds ?? [];
    if (ids.length === 0) {
      unassigned.push(contact);
    } else {
      for (const goalId of ids) {
        const current = grouped.get(goalId) ?? [];
        current.push(contact);
        grouped.set(goalId, current);
      }
    }
  }

  const sections = Array.from(grouped.entries())
    .map(([goalId, sectionContacts]) => ({
      goalId,
      goalName: goals.find((g) => g.id === goalId)?.name ?? goalId,
      contacts: sectionContacts,
    }))
    .filter((s) => s.contacts.length > 0);

  const result = buildGoalSections(goals, sections);

  if (unassigned.length > 0) {
    result.push({
      id: "goal:unassigned",
      label: "No Goal",
      createLabel: "New Contact",
      contacts: unassigned,
    });
  }

  return result;
}

export function buildAreaContactProjectSections(contacts: Contact[], projects: Project[]): ContactCategorySection[] {
  const unassigned: Contact[] = [];
  const grouped = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const ids = contact.linkedProjectIds ?? [];
    if (ids.length === 0) {
      unassigned.push(contact);
    } else {
      for (const projectId of ids) {
        const current = grouped.get(projectId) ?? [];
        current.push(contact);
        grouped.set(projectId, current);
      }
    }
  }

  const sections = Array.from(grouped.entries())
    .map(([projectId, sectionContacts]) => ({
      projectId,
      projectName: projects.find((p) => p.id === projectId)?.name ?? projectId,
      contacts: sectionContacts,
    }))
    .filter((s) => s.contacts.length > 0);

  const result = buildProjectSections(projects, sections);

  if (unassigned.length > 0) {
    result.push({
      id: "project:unassigned",
      label: "No Project",
      createLabel: "New Contact",
      contacts: unassigned,
    });
  }

  return result;
}

export function buildAreaContactGroupSections(contacts: Contact[]): ContactCategorySection[] {
  const grouped: Record<string, Contact[]> = {};

  for (const contact of contacts) {
    const group = contact.group ?? "Ungrouped";
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(contact);
  }

  return buildGroupSections(grouped);
}

export function buildAreaContactFollowUpSections(contacts: Contact[]): FollowUpSection[] {
  return buildFollowUpSections(contacts);
}

export function buildContactByAreaSections(contacts: Contact[], areas: Area[]): ContactCategorySection[] {
  const unassigned: Contact[] = [];
  const grouped = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const ids = contact.linkedAreaIds ?? [];
    if (ids.length === 0) {
      unassigned.push(contact);
    } else {
      for (const areaId of ids) {
        const current = grouped.get(areaId) ?? [];
        current.push(contact);
        grouped.set(areaId, current);
      }
    }
  }

  const sections = Array.from(grouped.entries())
    .map(([areaId, sectionContacts]) => ({
      areaId,
      areaName: areas.find((a) => a.id === areaId)?.name ?? areaId,
      contacts: sectionContacts,
    }))
    .filter((s) => s.contacts.length > 0);

  const result = buildAreaSections(areas, sections);

  if (unassigned.length > 0) {
    result.push({
      id: "area:unassigned",
      label: "No Area",
      createLabel: "New Contact",
      contacts: unassigned,
    });
  }

  return result;
}
