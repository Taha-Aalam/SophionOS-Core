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

export function DashboardContent() {
  const { user } = useAuth();
  const data = useDashboardToday();

  if (!data) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
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
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
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
