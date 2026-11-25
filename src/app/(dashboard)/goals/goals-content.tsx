"use client";

import { cardGrid, contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, CheckCircle, Clock, Flag, PauseCircle, Plus, Target } from "lucide-react";
import { RocketIcon } from "@/components/icons";

import { useI18n } from "@/components/providers/i18n-provider";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals, useRestoreGoal, useArchiveGoal } from "@/lib/hooks/use-goals";
import { useFilterStore } from "@/lib/stores/filters.store";
import { Goal } from "@/lib/types/domain.types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import {
  getGoalFiltersForView,
  getGoalLinkedAreaIds,
  getGoalViewFromFilters,
  goalMatchesFilters,
  type GoalStatusFilter,
  type GoalView,
} from "@/lib/utils/goals";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";

export function GoalsContent() {
  const { t } = useI18n();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { filters, setStatus, setTerm } = useFilterStore();
  const { data: goals, isLoading, isError, refetch } = useGoals(filters);
  const { data: areas = [] } = useAreas();
  const restoreGoal = useRestoreGoal();
  const archiveGoal = useArchiveGoal();

  const currentView = getGoalViewFromFilters({
    status: filters.status,
    term: filters.term,
  });
  const filteredGoals = useMemo(
    () => (goals ?? []).filter((goal) => goalMatchesFilters(goal, { ...filters, status: filters.status as GoalStatusFilter })),
    [goals, filters],
  );

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
    if (!filteredGoals) return new Map<string, number>();
    const result = new Map<string, number>();

    const grouped = new Map<string, Goal[]>();
    for (const goal of filteredGoals) {
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
  }, [filteredGoals]);

  const handleViewChange = (view: string) => {
    const nextView = view as GoalView;
    const nextFilters = getGoalFiltersForView(nextView);
    setTerm(nextFilters.term);
    setStatus(nextFilters.status);
  };

  const emptyStateDescriptionByView: Record<GoalView, TranslationKey> = {
    active: "goals.empty.active",
    short: "goals.empty.short",
    mid: "goals.empty.mid",
    long: "goals.empty.long",
    inactive: "goals.empty.inactive",
    completed: "goals.empty.completed",
    archive: "goals.empty.archive",
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState message={t("goals.error")} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className={cn("content-fade-in reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RocketIcon size={24} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("nav.goals")}</h1>
            <p className="text-muted-foreground">{t("goals.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> {t("action.newGoal")}
          </Button>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={handleViewChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="active">
            <Target className="mr-1.5 size-3.5" />
            {t("goals.tabs.active")}
          </TabsTrigger>
          <TabsTrigger value="short">
            <Clock className="mr-1.5 size-3.5" />
            {t("goals.tabs.short")}
          </TabsTrigger>
          <TabsTrigger value="mid">
            <CalendarDays className="mr-1.5 size-3.5" />
            {t("goals.tabs.mid")}
          </TabsTrigger>
          <TabsTrigger value="long">
            <Flag className="mr-1.5 size-3.5" />
            {t("goals.tabs.long")}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <PauseCircle className="mr-1.5 size-3.5" />
            {t("goals.tabs.inactive")}
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="mr-1.5 size-3.5" />
            {t("goals.tabs.completed")}
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="mr-1.5 size-3.5" />
            {t("goals.tabs.archive")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {currentView === "inactive" && (
        <p className="text-sm text-muted-foreground">
          {t("goals.inactiveHint")}
        </p>
      )}

      {isLoading ? (
        <div className={cardGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredGoals && filteredGoals.length > 0 ? (
        <div className={cardGrid}>
          {filteredGoals.map((goal) => {
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
                areaName={(() => { const id = getGoalLinkedAreaIds(goal)[0]; return id ? areaNamesById.get(id) : t("common.unassigned"); })()}
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
          title={t("goals.empty.title")}
          description={t(emptyStateDescriptionByView[currentView])}
          actionLabel={
            currentView === "active"
              ? t("action.newGoal")
              : t("action.viewActiveGoals")
          }
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
