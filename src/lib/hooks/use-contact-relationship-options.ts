import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import type {
  AreaEntity,
  GoalEntity,
  ProjectEntity,
  TaskEntity,
  FilteredResults,
} from "@/lib/utils/contact-relationship-filters";
import {
  computeFilteredOptions,
  cleanInvalidSelections,
} from "@/lib/utils/contact-relationship-filters";

// ---------------------------------------------------------------------------
// Query keys (internal)
// ---------------------------------------------------------------------------

const GOAL_PROJECT_RELATIONS_KEY = "goal-project-relations";
const GOAL_TASK_RELATIONS_KEY = "goal-task-relations";

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

export interface UseContactRelationshipOptionsParams {
  allAreas: AreaEntity[];
  allGoals: GoalEntity[];
  allProjects: ProjectEntity[];
  allTasks: TaskEntity[];
  selectedAreaIds: string[];
  selectedGoalIds: string[];
  selectedProjectIds: string[];
  selectedTaskIds: string[];
  /** Whether the goal_projects/goal_tasks queries should be enabled. */
  enabled?: boolean;
}

export interface UseContactRelationshipOptionsResult extends FilteredResults {
  isRelationsLoading: boolean;
  /** Remove any selections that are no longer valid given current filters. */
  cleanSelections: () => {
    areaIds: string[];
    goalIds: string[];
    projectIds: string[];
    taskIds: string[];
    changed: boolean;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useContactRelationshipOptions(
  params: UseContactRelationshipOptionsParams,
): UseContactRelationshipOptionsResult {
  const {
    allAreas,
    allGoals,
    allProjects,
    allTasks,
    selectedAreaIds,
    selectedGoalIds,
    selectedProjectIds,
    selectedTaskIds,
    enabled = true,
  } = params;

  const { data: goalProjectRelations = [], isLoading: isLoadingGPRelations } = useQuery({
    queryKey: [GOAL_PROJECT_RELATIONS_KEY],
    queryFn: async () => {
      const { data } = await createClient().from("goal_projects").select("goal_id, project_id");
      return data ?? [];
    },
    enabled,
  });

  const { data: goalTaskRelations = [], isLoading: isLoadingGTRelations } = useQuery({
    queryKey: [GOAL_TASK_RELATIONS_KEY],
    queryFn: async () => {
      const { data } = await createClient().from("goal_tasks").select("goal_id, task_id");
      return data ?? [];
    },
    enabled,
  });

  const isRelationsLoading = isLoadingGPRelations || isLoadingGTRelations;

  const filtered = useMemo(
    () =>
      computeFilteredOptions({
        allAreas,
        allGoals,
        allProjects,
        allTasks,
        selectedAreaIds,
        selectedGoalIds,
        selectedProjectIds,
        selectedTaskIds,
        goalProjectRelations,
        goalTaskRelations,
      }),
    [
      allAreas,
      allGoals,
      allProjects,
      allTasks,
      selectedAreaIds,
      selectedGoalIds,
      selectedProjectIds,
      selectedTaskIds,
      goalProjectRelations,
      goalTaskRelations,
    ],
  );

  const cleanSelections = () =>
    cleanInvalidSelections(
      { selectedAreaIds, selectedGoalIds, selectedProjectIds, selectedTaskIds },
      filtered,
    );

  return {
    ...filtered,
    isRelationsLoading,
    cleanSelections,
  };
}
