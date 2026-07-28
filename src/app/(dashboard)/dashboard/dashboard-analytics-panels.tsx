"use client";

import { memo, useMemo } from "react";
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

function DashboardAnalyticsPanelsImpl({
  areas,
  goals,
  projects,
  tasks,
  notes,
  resources,
  topics,
  contacts,
}: DashboardAnalyticsPanelsProps) {
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
    <div className="cockpit-stagger flex flex-col gap-4">
      <KpiStrip kpis={analytics.kpis} />

      {/* Primary: execution + momentum */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ExecutionLoadPanel load={analytics.executionLoad} />
        <GoalMomentumPanel momentum={analytics.goalMomentum} />
      </div>

      {/* Activity map leads; work health sits beside it — equal row height */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <div className="h-full min-h-0 xl:col-span-3">
          <ActivityHeatmap heatmap={analytics.heatmap} />
        </div>
        <div className="h-full min-h-0 xl:col-span-2">
          <WorkHealthPanel health={analytics.workHealth} />
        </div>
      </div>

      {/* Secondary: knowledge + context */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <KnowledgePipeline pipeline={analytics.knowledgePipeline} />
        <ContextNetworkMini network={analytics.contextNetwork} />
      </div>

      <RelationshipRiskPanel risk={analytics.relationshipRisk} />
    </div>
  );
}

/** Skip re-renders when parent dialogs/mutations re-render without entity changes. */
export const DashboardAnalyticsPanels = memo(DashboardAnalyticsPanelsImpl);
