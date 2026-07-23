import { describe, expect, it } from "vitest";

import {
  buildDashboardAnalytics,
  getGoalProgressBucket,
} from "@/lib/analytics/dashboard-analytics";
import { GOAL_TERM, NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, TASK_STATUS } from "@/lib/utils/constants";
import type { Area, Contact, Goal, Note, Project, Resource, Task, Topic } from "@/lib/types/domain.types";

const now = new Date("2026-07-18T12:00:00.000Z");

function task(input: Partial<Task> & { id: string }): Task {
  return {
    id: input.id,
    user_id: "user_1",
    title: input.title ?? input.name ?? "Task",
    name: input.name ?? input.title ?? "Task",
    description: null,
    status: input.status ?? TASK_STATUS.TODO,
    priority: input.priority ?? "medium",
    due_date: input.due_date ?? null,
    completed_at: input.completed_at ?? null,
    is_completed: input.is_completed ?? false,
    is_focused: input.is_focused ?? false,
    is_archived: input.is_archived ?? false,
    is_important: false,
    is_urgent: false,
    project_id: input.project_id ?? null,
    area_id: input.area_id ?? null,
    goal_id: null,
    repeat_cycle: null,
    repeat_every: null,
    is_recurring: false,
    created_at: input.created_at ?? "2026-07-18T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-18T08:00:00.000Z",
    linkedAreaIds: input.linkedAreaIds,
    linkedGoalIds: input.linkedGoalIds,
    linkedProjectIds: input.linkedProjectIds,
  } as Task;
}

function goal(input: Partial<Goal> & { id: string }): Goal {
  return {
    id: input.id,
    user_id: "user_1",
    title: input.title ?? input.name ?? "Goal",
    name: input.name ?? input.title ?? "Goal",
    description: null,
    status: "active",
    priority: input.priority ?? "medium",
    progress: input.progress ?? 0,
    term: input.term ?? GOAL_TERM.SHORT,
    target_date: input.target_date ?? null,
    area_id: input.area_id ?? null,
    is_completed: input.is_completed ?? false,
    is_archived: input.is_archived ?? false,
    is_inactive: false,
    created_at: input.created_at ?? "2026-07-01T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-18T08:00:00.000Z",
    linkedAreaIds: input.linkedAreaIds,
    projectCount: input.projectCount,
    taskCount: input.taskCount,
    noteCount: input.noteCount,
    resourceCount: input.resourceCount,
  } as Goal;
}

function project(input: Partial<Project> & { id: string }): Project {
  return {
    id: input.id,
    user_id: "user_1",
    name: input.name ?? "Project",
    description: null,
    status: input.status ?? PROJECT_STATUS.ACTIVE,
    priority: input.priority ?? "medium",
    progress: input.progress ?? 0,
    due_date: input.due_date ?? null,
    start_date: null,
    area_id: input.area_id ?? null,
    is_archived: input.is_archived ?? false,
    created_at: input.created_at ?? "2026-07-01T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-01T08:00:00.000Z",
    linkedAreaIds: input.linkedAreaIds,
    linkedGoalIds: input.linkedGoalIds,
  } as Project;
}

function note(input: Partial<Note> & { id: string }): Note {
  return {
    id: input.id,
    user_id: "user_1",
    title: input.title ?? input.name ?? "Note",
    name: input.name ?? input.title ?? "Note",
    content: "",
    type: "note",
    status: input.status ?? NOTE_STATUS.INBOX,
    topic_id: input.topic_id ?? null,
    area_id: input.area_id ?? null,
    project_id: input.project_id ?? null,
    favorite: false,
    pin: false,
    is_archived: input.is_archived ?? false,
    created_at: input.created_at ?? "2026-07-18T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-18T08:00:00.000Z",
    linkedAreaIds: input.linkedAreaIds,
    linkedGoalIds: input.linkedGoalIds,
    linkedProjectIds: input.linkedProjectIds,
    linkedTaskIds: input.linkedTaskIds,
  } as Note;
}

function resource(input: Partial<Resource> & { id: string }): Resource {
  return {
    id: input.id,
    user_id: "user_1",
    name: input.name ?? "Resource",
    url: input.url ?? null,
    type: "article",
    status: input.status ?? RESOURCE_STATUS.TO_REVIEW,
    topic_id: input.topic_id ?? null,
    area_id: input.area_id ?? null,
    project_id: input.project_id ?? null,
    favorite: false,
    is_archived: input.is_archived ?? false,
    created_at: input.created_at ?? "2026-07-18T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-18T08:00:00.000Z",
    linkedAreaIds: input.linkedAreaIds,
    linkedGoalIds: input.linkedGoalIds,
    linkedProjectIds: input.linkedProjectIds,
    linkedTaskIds: input.linkedTaskIds,
  } as Resource;
}

function contact(input: Partial<Contact> & { id: string }): Contact {
  return {
    id: input.id,
    user_id: "user_1",
    name: input.name ?? "Contact",
    role: null,
    organization: null,
    group: input.group ?? null,
    phone: null,
    email: null,
    linkedin: null,
    website: null,
    image_url: null,
    last_interaction_at: input.last_interaction_at ?? null,
    follow_up_interval_days: input.follow_up_interval_days ?? 14,
    favorite: false,
    notes: null,
    archive: input.archive ?? false,
    created_at: input.created_at ?? "2026-07-01T08:00:00.000Z",
    updated_at: input.updated_at ?? "2026-07-01T08:00:00.000Z",
    linkedProjectIds: input.linkedProjectIds,
    linkedTaskIds: input.linkedTaskIds,
  } as Contact;
}

function topic(input: Partial<Topic> & { id: string }): Topic {
  return {
    id: input.id,
    user_id: "user_1",
    name: input.name ?? "Topic",
    area_id: input.area_id ?? null,
    favorite: false,
    inactive: false,
    is_archived: false,
    slug: null,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
  } as Topic;
}

describe("dashboard analytics", () => {
  it("buckets goals by progress", () => {
    expect(getGoalProgressBucket(goal({ id: "g1", progress: 15 }), now)).toBe("stuck");
    expect(getGoalProgressBucket(goal({ id: "g2", progress: 45 }), now)).toBe("moving");
    expect(getGoalProgressBucket(goal({ id: "g3", progress: 85 }), now)).toBe("almostDone");
  });

  it("derives KPIs, execution load, work health, and goal momentum", () => {
    const analytics = buildDashboardAnalytics({
      now,
      areas: [{ id: "a1", name: "Work", archive: false, inactive: false } as Area],
      goals: [
        goal({ id: "g1", progress: 10, target_date: "2026-07-22", linkedAreaIds: ["a1"] }),
        goal({ id: "g2", progress: 80, linkedAreaIds: ["a1"] }),
      ],
      projects: [
        project({ id: "p1", name: "Launch", area_id: "a1", updated_at: "2026-06-20T08:00:00.000Z" }),
      ],
      tasks: [
        task({ id: "t1", is_focused: true, due_date: "2026-07-18", linkedAreaIds: ["a1"], linkedProjectIds: ["p1"] }),
        task({ id: "t2", due_date: "2026-07-10", linkedAreaIds: ["a1"], linkedProjectIds: ["p1"] }),
        // In progress and unassigned (no area/project/goal links) — with t5 yields unassignedTasks=2
        task({ id: "t3", status: TASK_STATUS.IN_PROGRESS }),
        task({ id: "t4", status: TASK_STATUS.COMPLETED, is_completed: true, completed_at: "2026-07-16T08:00:00.000Z" }),
        task({ id: "t5" }),
      ],
      notes: [],
      resources: [],
      topics: [],
      contacts: [],
    });

    expect(analytics.kpis.focusTasks).toBe(1);
    expect(analytics.kpis.overdueTasks).toBe(1);
    expect(analytics.kpis.completedThisWeek).toBe(1);
    expect(analytics.kpis.activeGoals).toBe(2);
    expect(analytics.executionLoad.inProgress).toBe(1);
    expect(analytics.workHealth.stalledProjects[0]?.id).toBe("p1");
    expect(analytics.workHealth.lowProgressNearDueGoals[0]?.id).toBe("g1");
    expect(analytics.workHealth.unassignedTasks).toBe(2);
    expect(analytics.goalMomentum.stalledGoals).toBe(1);
  });

  it("derives knowledge pipeline, relationship risk, heatmap, and network density", () => {
    const analytics = buildDashboardAnalytics({
      now,
      areas: [{ id: "a1", name: "Work", archive: false, inactive: false } as Area],
      goals: [goal({ id: "g1", linkedAreaIds: ["a1"] })],
      projects: [project({ id: "p1", linkedAreaIds: ["a1"], linkedGoalIds: ["g1"] })],
      tasks: [task({ id: "t1", linkedAreaIds: ["a1"], linkedGoalIds: ["g1"], linkedProjectIds: ["p1"] })],
      notes: [
        note({ id: "n1", status: NOTE_STATUS.INBOX, topic_id: "topic_1", created_at: "2026-07-18T08:00:00.000Z" }),
        note({
          id: "n2",
          status: NOTE_STATUS.TO_REVIEW,
          topic_id: "topic_1",
          created_at: "2026-07-10T08:00:00.000Z",
        }),
        note({ id: "n3", status: NOTE_STATUS.COMPLETED, created_at: "2026-07-10T08:00:00.000Z" }),
        note({ id: "n4", is_archived: true, created_at: "2026-07-10T08:00:00.000Z" }),
      ],
      resources: [
        resource({
          id: "r1",
          status: RESOURCE_STATUS.TO_REVIEW,
          topic_id: "topic_1",
          created_at: "2026-07-18T09:00:00.000Z",
        }),
        resource({ id: "r2", status: RESOURCE_STATUS.COMPLETED, created_at: "2026-07-10T08:00:00.000Z" }),
      ],
      topics: [topic({ id: "topic_1", name: "AI Research" })],
      contacts: [
        contact({
          id: "c1",
          last_interaction_at: "2026-06-20T08:00:00.000Z",
          follow_up_interval_days: 14,
          linkedProjectIds: ["p1"],
        }),
      ],
    });

    expect(analytics.knowledgePipeline.capturedToday).toBe(2);
    expect(analytics.knowledgePipeline.waitingReview).toBe(3);
    expect(analytics.knowledgePipeline.saved).toBe(2);
    expect(analytics.knowledgePipeline.archived).toBe(1);
    expect(analytics.knowledgePipeline.mostActiveTopics[0]).toEqual({
      id: "topic_1",
      name: "AI Research",
      count: 3,
    });
    expect(analytics.relationshipRisk.followUpsDue).toBe(1);
    expect(analytics.relationshipRisk.tiedToActiveProjects).toBe(1);
    // GitHub-style last-year window: ≥365 days, ends on "today" with today's captures
    expect(analytics.heatmap.days.length).toBeGreaterThanOrEqual(365);
    expect(analytics.heatmap.days.at(-1)?.date).toBe("2026-07-18");
    expect(analytics.heatmap.days.at(-1)?.total).toBe(2);
    // Window starts on a Monday (aligned contribution grid)
    const first = analytics.heatmap.days[0]?.date;
    expect(first).toBeTruthy();
    if (first) {
      const d = new Date(`${first}T12:00:00`);
      expect(d.getDay()).toBe(1); // Monday
    }
    expect(analytics.contextNetwork.densityScore).toBeGreaterThan(0);
  });

  it("treats date-only due_date as local calendar day for today vs overdue", () => {
    // Local noon on 2026-07-18 — date-only "2026-07-18" must count as today,
    // not overdue, west of UTC (matches tasks.ts parseDateOnly).
    const localNow = new Date(2026, 6, 18, 12, 0, 0);
    const analytics = buildDashboardAnalytics({
      now: localNow,
      areas: [],
      goals: [],
      projects: [],
      tasks: [
        task({ id: "today", due_date: "2026-07-18" }),
        task({ id: "overdue", due_date: "2026-07-17" }),
      ],
      notes: [],
      resources: [],
      topics: [],
      contacts: [],
    });

    expect(analytics.executionLoad.today).toBe(1);
    expect(analytics.kpis.overdueTasks).toBe(1);
    expect(analytics.executionLoad.overdue).toBe(1);
  });

  it("reports finite follow-up overdue when last_interaction_at is null", () => {
    const analytics = buildDashboardAnalytics({
      now,
      areas: [],
      goals: [],
      projects: [],
      tasks: [],
      notes: [],
      resources: [],
      topics: [],
      contacts: [
        contact({
          id: "c_null",
          last_interaction_at: null,
          follow_up_interval_days: 14,
          created_at: "2026-06-01T08:00:00.000Z",
        }),
      ],
    });

    expect(analytics.relationshipRisk.followUpsDue).toBe(1);
    const row = analytics.relationshipRisk.contacts[0];
    expect(row?.id).toBe("c_null");
    expect(Number.isFinite(row!.daysOverdue)).toBe(true);
    expect(row!.daysOverdue).toBeGreaterThanOrEqual(0);
    expect(String(row!.daysOverdue)).not.toMatch(/Infinity/i);
  });
});
