"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useDashboardToday } from "@/lib/hooks/use-dashboard";
import { GreetingBar } from "@/components/dashboard/greeting-bar";
import { TodayTasksList } from "@/components/dashboard/today-tasks-list";
import { ActiveGoalsWidget } from "@/components/dashboard/active-goals-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  GreetingBarSkeleton,
  TaskListSkeleton,
  ActiveGoalsSkeleton,
  ActivityFeedSkeleton,
} from "@/components/dashboard/dashboard-skeletons";

export default function DashboardPage() {
  const { user } = useAuth();
  const data = useDashboardToday();

  // When a task mutation fires (complete/focus/update), invalidateTaskGraph
  // in use-tasks.ts invalidates the DASHBOARD_QUERY_KEY, so this query refetches.

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <GreetingBarSkeleton />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
          <TaskListSkeleton />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Active Goals</h2>
          <ActiveGoalsSkeleton />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ActivityFeedSkeleton />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <GreetingBar
        userName={user?.user_metadata?.full_name}
        tasksTodayCount={data.tasksTodayCount}
        stats={data.stats}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
        </div>
        <TodayTasksList tasks={data.todayTasks} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Goals</h2>
        </div>
        <ActiveGoalsWidget goals={data.activeGoals} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <ActivityFeed items={data.recentActivity} />
      </section>
    </div>
  );
}