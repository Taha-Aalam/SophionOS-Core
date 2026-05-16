import type { Area, Contact, Goal, Project } from "@/lib/types/domain.types";
import { CONTACT_GROUPS } from "@/lib/constants/contact-groups";

export interface ContactCategorySection {
  id: string;
  label: string;
  createLabel: string;
  contacts: Contact[];
}

export function buildGroupSections(groupedContacts: Record<string, Contact[]>): ContactCategorySection[] {
  const ungrouped = groupedContacts.Ungrouped?.length ? ["Ungrouped"] : [];
  return [...CONTACT_GROUPS, ...ungrouped]
    .map((group) => ({
      id: `group:${group}`,
      label: group,
      createLabel: `New ${group} Contact`,
      contacts: groupedContacts[group] ?? [],
    }))
    .filter((s) => s.contacts.length > 0);
}

export function buildProjectSections(
  projects: Project[],
  grouped: Array<{ projectId: string; projectName: string; contacts: Contact[] }>,
): ContactCategorySection[] {
  const byId = new Map(grouped.map((section) => [section.projectId, section.contacts]));
  return projects
    .filter((project) => !project.is_archived)
    .map((project) => ({
      id: `project:${project.id}`,
      label: project.name,
      createLabel: `New Contact For ${project.name}`,
      contacts: byId.get(project.id) ?? [],
    }))
    .filter((s) => s.contacts.length > 0);
}

export function buildAreaSections(
  areas: Area[],
  grouped: Array<{ areaId: string; areaName: string; contacts: Contact[] }>,
): ContactCategorySection[] {
  const byId = new Map(grouped.map((section) => [section.areaId, section.contacts]));
  return areas
    .filter((area) => !area.archive)
    .map((area) => ({
      id: `area:${area.id}`,
      label: area.name,
      createLabel: `New Contact For ${area.name}`,
      contacts: byId.get(area.id) ?? [],
    }))
    .filter((s) => s.contacts.length > 0);
}

export function buildGoalSections(
  goals: Goal[],
  grouped: Array<{ goalId: string; goalName: string; contacts: Contact[] }>,
): ContactCategorySection[] {
  const byId = new Map(grouped.map((section) => [section.goalId, section.contacts]));
  return goals
    .filter((goal) => !goal.is_archived)
    .map((goal) => ({
      id: `goal:${goal.id}`,
      label: goal.name,
      createLabel: `New Contact For ${goal.name}`,
      contacts: byId.get(goal.id) ?? [],
    }))
    .filter((s) => s.contacts.length > 0);
}
