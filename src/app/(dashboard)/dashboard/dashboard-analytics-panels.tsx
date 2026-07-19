"use client";

import { useMemo } from "react";
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

interface DashboardAnalyticsPanelsProps {
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  topics: Topic[];
  contacts: Contact[];
}

export function DashboardAnalyticsPanels({ areas, goals, projects, tasks, notes, resources, topics, contacts }: DashboardAnalyticsPanelsProps) {
  const analytics = useMemo(
    () =>
      buildDashboardAnalytics({
        areas,
        goals,
        projects,
        tasks,
        notes,
        resources,
        topics,
        contacts,
      }),
    [areas, goals, projects, tasks, notes, resources, topics, contacts],
  );

  return (
    <>
      <KpiStrip kpis={analytics.kpis} />

      {/* Primary analytics: execution + momentum */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ExecutionLoadPanel load={analytics.executionLoad} />
        <GoalMomentumPanel momentum={analytics.goalMomentum} />
      </div>

      {/* Full-width activity map */}
      <ActivityHeatmap heatmap={analytics.heatmap} />

      {/* Work health (product scope; not in Stitch export but kept in layer) */}
      <WorkHealthPanel health={analytics.workHealth} />

      {/* Secondary: knowledge + context */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <KnowledgePipeline pipeline={analytics.knowledgePipeline} />
        <ContextNetworkMini network={analytics.contextNetwork} />
      </div>

      {/* Full-width relationship risk */}
      <RelationshipRiskPanel risk={analytics.relationshipRisk} />
    </>
  );
}
