"use client";

import { relativeTime } from "@/lib/utils/dates";
import type { ActivityItem, ActivityEntityType } from "@/lib/services/dashboard.service";

interface ActivityFeedProps {
  items: ActivityItem[];
}

const entityLabels: Record<ActivityEntityType, string> = {
  task: "Task",
  goal: "Goal",
  project: "Project",
  area: "Area",
};

function ActivityIcon({ type }: { type: ActivityEntityType }) {
  const colors: Record<ActivityEntityType, string> = {
    task: "bg-blue-100 text-blue-600",
    goal: "bg-purple-100 text-purple-600",
    project: "bg-amber-100 text-amber-600",
    area: "bg-green-100 text-green-600",
  };
  const icons: Record<ActivityEntityType, string> = {
    task: "✦",
    goal: "◈",
    project: "◆",
    area: "▲",
  };
  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colors[type]}`}
      title={entityLabels[type]}
    >
      {icons[type]}
    </div>
  );
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No activity yet. Create your first task or goal to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.entityType}-${item.id}`} className="flex items-start gap-3">
          <ActivityIcon type={item.entityType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {entityLabels[item.entityType]} · {relativeTime(item.updatedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}