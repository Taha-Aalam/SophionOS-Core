"use client";

import { Suspense, useMemo } from "react";
import {
  ActivityHeatmap,
  ContextNetworkMini,
  ExecutionLoadPanel,
  GoalMomentumPanel,
  KpiStrip,
  KnowledgePipeline,
  RelationshipRiskPanel,
  WorkHealthPanel,
} from "@/components/dashboard/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDashboardAnalytics } from "@/lib/analytics/dashboard-analytics";
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

function AnalyticsPanels({ input }: { input: DashboardAnalyticsSectionProps }) {
  const analytics = useMemo(
    () =>
      buildDashboardAnalytics({
        areas: input.areas,
        goals: input.goals,
        projects: input.projects,
        tasks: input.tasks,
        notes: input.notes,
        resources: input.resources,
        topics: input.topics,
        contacts: input.contacts,
      }),
    [
      input.areas,
      input.goals,
      input.projects,
      input.tasks,
      input.notes,
      input.resources,
      input.topics,
      input.contacts,
    ],
  );

  return (
    <>
      <KpiStrip kpis={analytics.kpis} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ExecutionLoadPanel load={analytics.executionLoad} />
        <WorkHealthPanel health={analytics.workHealth} />
        <KnowledgePipeline pipeline={analytics.knowledgePipeline} />
        <GoalMomentumPanel momentum={analytics.goalMomentum} />
        <ActivityHeatmap heatmap={analytics.heatmap} />
        <ContextNetworkMini network={analytics.contextNetwork} />
        <RelationshipRiskPanel risk={analytics.relationshipRisk} />
      </div>
    </>
  );
}

export function DashboardAnalyticsSection(props: DashboardAnalyticsSectionProps) {
  return (
    <section className="space-y-4" aria-label="Dashboard analytics">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPanels input={props} />
      </Suspense>
    </section>
  );
}
