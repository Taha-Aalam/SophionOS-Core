"use client";

import { UserRoundSearch, Users } from "lucide-react";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface RelationshipRiskPanelProps {
  risk: DashboardAnalytics["relationshipRisk"];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function RelationshipRiskPanel({ risk }: RelationshipRiskPanelProps) {
  return (
    <AnalyticsPanel
      title="Relationship Risk"
      description="Follow-ups due, especially contacts on active projects."
      icon={UserRoundSearch}
      iconClassName="text-analytics-risk"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        <div className="space-y-2.5 md:col-span-1">
          <div className="flex items-center justify-between rounded-lg bg-analytics-risk/10 px-3 py-2.5">
            <span className="text-sm text-foreground">Follow-ups due</span>
            <span className="font-semibold tabular-nums text-analytics-risk">
              {risk.followUpsDue}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-sm text-foreground">On active projects</span>
            <span className="font-semibold tabular-nums text-foreground">
              {risk.tiedToActiveProjects}
            </span>
          </div>
        </div>
        <div className="border-border md:col-span-2 md:border-l md:pl-5">
          {risk.contacts.length === 0 ? (
            <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              No follow-up risk right now.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {risk.contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                      aria-hidden="true"
                    >
                      {initials(contact.name)}
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">
                      {contact.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-analytics-risk">
                    {contact.daysOverdue}d overdue
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AnalyticsPanel>
  );
}
