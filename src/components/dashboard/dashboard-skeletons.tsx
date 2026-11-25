"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function GreetingBarSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-4" aria-busy="true" role="status" aria-label={t("dashboardSkeletons.loadingGreeting")}>
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-2" aria-busy="true" role="status" aria-label={t("dashboardSkeletons.loadingTasks")}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ActiveGoalsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-busy="true" role="status" aria-label={t("dashboardSkeletons.loadingGoals")}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-48 flex-shrink-0 rounded-xl" />
      ))}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-3" aria-busy="true" role="status" aria-label={t("dashboardSkeletons.loadingActivity")}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}