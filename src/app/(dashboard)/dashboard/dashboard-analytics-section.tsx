"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {/* Panel grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

const DashboardAnalyticsPanels = dynamic(
  () =>
    import("./dashboard-analytics-panels").then(
      (m) => m.DashboardAnalyticsPanels,
    ),
  {
    ssr: false,
    loading: () => <AnalyticsSkeleton />,
  },
);

export function DashboardAnalyticsSection(props: DashboardAnalyticsSectionProps) {
  return (
    <section className="space-y-4" aria-label="Dashboard analytics">
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
