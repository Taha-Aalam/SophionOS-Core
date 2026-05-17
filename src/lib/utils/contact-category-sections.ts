import type { Area, Contact, Goal, Project } from "@/lib/types/domain.types";
import { CONTACT_GROUPS } from "@/lib/constants/contact-groups";

export interface ContactCategorySection {
  id: string;
  label: string;
  createLabel: string;
  contacts: Contact[];
}

export interface FollowUpSection {
  key: 'overdue' | 'upcoming' | 'this-month' | 'next-month' | 'this-quarter';
  label: string;
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

function getFollowUpCategory(
  lastInteractionAt: string | null | undefined,
  intervalDays: number | null | undefined,
): FollowUpSection['key'] | null {
  if (!intervalDays || intervalDays === 0) return null;
  if (!lastInteractionAt) return 'overdue';

  const now = new Date();
  const followUpDate = new Date(lastInteractionAt);
  followUpDate.setDate(followUpDate.getDate() + intervalDays);

  const daysUntil = Math.round(
    (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 7) return 'upcoming';

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const fYear = followUpDate.getFullYear();
  const fMonth = followUpDate.getMonth();

  if (fYear === nowYear && fMonth === nowMonth) return 'this-month';

  const nextMonthDate = new Date(nowYear, nowMonth + 1, 1);
  if (fYear === nextMonthDate.getFullYear() && fMonth === nextMonthDate.getMonth()) {
    return 'next-month';
  }

  const quarterStart = Math.floor(nowMonth / 3) * 3;
  if (fYear === nowYear && fMonth >= quarterStart && fMonth <= quarterStart + 2) {
    return 'this-quarter';
  }

  return null;
}

const FOLLOW_UP_SECTIONS_META: Array<Pick<FollowUpSection, 'key' | 'label'>> = [
  { key: 'overdue',      label: 'Overdue' },
  { key: 'upcoming',     label: 'Upcoming' },
  { key: 'this-month',   label: 'This Month' },
  { key: 'next-month',   label: 'Next Month' },
  { key: 'this-quarter', label: 'This Quarter' },
];

export function buildFollowUpSections(contacts: Contact[]): FollowUpSection[] {
  const grouped = new Map<FollowUpSection['key'], Contact[]>();
  for (const c of contacts) {
    const cat = getFollowUpCategory(c.last_interaction_at, c.follow_up_interval_days);
    if (!cat) continue;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(c);
  }
  return FOLLOW_UP_SECTIONS_META
    .map(({ key, label }) => ({ key, label, contacts: grouped.get(key) ?? [] }))
    .filter((s) => s.contacts.length > 0);
}
