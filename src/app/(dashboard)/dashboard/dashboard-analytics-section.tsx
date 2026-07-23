"use client";

import { DashboardAnalyticsPanels } from "./dashboard-analytics-panels";
import type {
  Area,
  Contact,
  Goal,
  Note,
  Project,
  Resource,
  Task,
  Topic,
} from "@/lib/types/domain.types";

interface DashboardAnalyticsSectionProps {
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  topics: Topic[];
  contacts: Contact[];
}

/**
 * Analytics are imported statically (not next/dynamic with a loading skeleton)
 * so after the page-level skeleton unmounts the dashboard paints once —
 * no second analytics-only skeleton flash.
 */
export function DashboardAnalyticsSection(props: DashboardAnalyticsSectionProps) {
  return (
    <section className="min-w-0" aria-label="Dashboard analytics">
      <DashboardAnalyticsPanels
        areas={props.areas}
        goals={props.goals}
        projects={props.projects}
        tasks={props.tasks}
        notes={props.notes}
        resources={props.resources}
        topics={props.topics}
        contacts={props.contacts}
      />
    </section>
  );
}
