"use client";

import { Archive, BookOpen, Inbox, Library, Sparkles } from "lucide-react";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";
import { cn } from "@/lib/utils";

interface KnowledgePipelineProps {
  pipeline: DashboardAnalytics["knowledgePipeline"];
}

export function KnowledgePipeline({ pipeline }: KnowledgePipelineProps) {
  const metrics = [
    {
      label: "Captured",
      value: pipeline.capturedToday,
      icon: Sparkles,
      iconClass: "text-analytics-accent",
    },
    {
      label: "Review",
      value: pipeline.waitingReview,
      icon: Inbox,
      iconClass: "text-analytics-action",
    },
    {
      label: "Saved",
      value: pipeline.saved,
      icon: Library,
      iconClass: "text-muted-foreground",
    },
    {
      label: "Archived",
      value: pipeline.archived,
      icon: Archive,
      iconClass: "text-muted-foreground",
    },
  ];

  return (
    <AnalyticsPanel
      title="Knowledge Pipeline"
      description="Capture through archive, plus topics with the most activity."
      icon={BookOpen}
    >
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-2"
            >
              <Icon className={cn("size-4 shrink-0", metric.iconClass)} aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="font-semibold tabular-nums text-foreground">{metric.value}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border/60 pt-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Most active topics
        </div>
        {pipeline.mostActiveTopics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topic activity yet.</p>
        ) : (
          <div className="space-y-1.5">
            {pipeline.mostActiveTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm"
              >
                <span className="truncate text-foreground">{topic.name}</span>
                <span className="rounded-full bg-foreground px-1.5 py-0.5 text-2xs font-medium tabular-nums text-background">
                  {topic.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnalyticsPanel>
  );
}
