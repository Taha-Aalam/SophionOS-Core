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
