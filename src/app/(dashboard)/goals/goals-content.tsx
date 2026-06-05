"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, CheckCircle, Clock, Flag, PauseCircle, Plus, Target } from "lucide-react";

import { GoalCard } from "@/components/entities/goal-card";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals, useRestoreGoal, useArchiveGoal } from "@/lib/hooks/use-goals";
import { useFilterStore } from "@/lib/stores/filters.store";
import { Goal } from "@/lib/types/domain.types";
import {
  getGoalFiltersForView,
  getGoalLinkedAreaIds,
  getGoalViewFromFilters,
  type GoalView,
} from "@/lib/utils/goals";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";

export function GoalsContent() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { filters, setStatus, setTerm } = useFilterStore();
  const { data: goals, isLoading } = useGoals(filters);
  const { data: areas = [] } = useAreas();
  const restoreGoal = useRestoreGoal();
  const archiveGoal = useArchiveGoal();

  const currentView = getGoalViewFromFilters({
    status: filters.status,
    term: filters.term,
  });
  const areaNamesById = useMemo(
    () =>
      new Map(
        areas.map((area) => [area.id, area.name]),
      ),
    [areas],
  );
  const areaIconsById = useMemo(
    () => new Map(areas.map((area) => [area.id, (area.icon as string | null | undefined) ?? null])),
    [areas],
  );

  // Compute duplicate occurrence index per goal name (real duplicates only)
  const duplicateIndices = useMemo(() => {
    if (!goals) return new Map<string, number>();
    const result = new Map<string, number>();

    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      if (!grouped.has(goal.name)) {
        grouped.set(goal.name, []);
      }
      grouped.get(goal.name)!.push(goal);
    }

    for (const group of grouped.values()) {
      if (group.length < 2) continue;

      const byCreationOrder = [...group].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );

      byCreationOrder.forEach((goal, index) => {
        result.set(goal.id, index + 1);
      });
    }

    return result;
  }, [goals]);

  const handleViewChange = (view: string) => {
    const nextView = view as GoalView;
    const nextFilters = getGoalFiltersForView(nextView);
    setTerm(nextFilters.term);
    setStatus(nextFilters.status);
  };

  const emptyStateDescriptionByView: Record<GoalView, string> = {
    active: "Create your first goal to start tracking meaningful progress.",
    short: "No short-term goals match the current filters.",
    mid: "No mid-term goals match the current filters.",
    long: "No long-term goals match the current filters.",
    inactive: "Goals with no linked projects, tasks, notes, or resources appear here.",
    completed: "Completed goals will appear here once you finish one.",
    archive: "Archived goals will appear here.",
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">🎯</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
            <p className="text-muted-foreground">Track and achieve your long-term objectives.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> New Goal
          </Button>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={handleViewChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1">
          <TabsTrigger value="active">
            <Target className="mr-1.5 size-3.5" />
            Active
          </TabsTrigger>
          <TabsTrigger value="short">
            <Clock className="mr-1.5 size-3.5" />
            Short Term
          </TabsTrigger>
          <TabsTrigger value="mid">
            <CalendarDays className="mr-1.5 size-3.5" />
            Mid Term
          </TabsTrigger>
          <TabsTrigger value="long">
            <Flag className="mr-1.5 size-3.5" />
            Long Term
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <PauseCircle className="mr-1.5 size-3.5" />
            Inactive
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="mr-1.5 size-3.5" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="mr-1.5 size-3.5" />
            Archive
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {currentView === "inactive" && (
        <p className="text-sm text-muted-foreground">
          Goals with no linked projects, tasks, notes, or resources are shown here.
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const linkedAreaNames = getGoalLinkedAreaIds(goal)
              .map((id) => areaNamesById.get(id))
              .filter((name): name is string => Boolean(name));
            const linkedAreaIcons = getGoalLinkedAreaIds(goal).map(
              (id) => areaIconsById.get(id) ?? null,
            );
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                areaName={goal.area_id ? areaNamesById.get(goal.area_id) : "Unassigned"}
                areaNames={linkedAreaNames}
                areaIcons={linkedAreaIcons}
                duplicateIndex={duplicateIndices.get(goal.id)}
                rollups={
                  goal.projectCount !== undefined
                    ? {
                        projectCount: goal.projectCount,
                        taskCount: goal.taskCount ?? 0,
                        noteCount: goal.noteCount ?? 0,
                        resourceCount: goal.resourceCount ?? 0,
                      }
                    : undefined
                }
                onEdit={() => {
                  router.push(buildGoalDetailHref(goal));
                }}
                onRestore={(g) => restoreGoal.mutate(g.id)}
                onArchive={(g) => archiveGoal.mutate(g.id)}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="No goals found"
          description={emptyStateDescriptionByView[currentView]}
          actionLabel={currentView === "active" ? "Create Goal" : "View Active Goals"}
          onAction={() => {
            if (currentView === "active") {
              setEditingGoal(null);
              setIsCreateOpen(true);
              return;
            }

            handleViewChange("active");
          }}
        />
      )}

      <GoalDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingGoal(null);
          }
        }}
        goal={editingGoal}
        onSuccess={() => setEditingGoal(null)}
      />
    </div>
  );
}
