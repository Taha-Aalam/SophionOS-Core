"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

interface GoalProjectRow {
  goal_id: string;
  project_id: string;
}

export interface GoalProjectRelations {
  rows: GoalProjectRow[];
  goalProjectIdsMap: Map<string, string[]>;
  projectGoalIdsMap: Map<string, string[]>;
  isLoading: boolean;
}

/**
 * Single source of truth for the `goal_projects` relation table.
 *
 * Returns the raw rows plus both lookup maps (forward and reverse), so
 * callers no longer re-implement the same `useMemo` reduction. Most callers
 * just need `goalProjectIdsMap` (the project list for a given goal).
 *
 * Sharing one hook across pages guarantees the relation data is fetched and
 * shaped the same way (the previous bug: dashboard passed an empty Map and
 * silently dropped goal-derived projects from the resource's effective
 * project list).
 */
export function useGoalProjectRelations(options?: { enabled?: boolean }): GoalProjectRelations {
  const enabled = options?.enabled ?? true;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["goal-project-relations", "shared"],
    queryFn: async (): Promise<GoalProjectRow[]> => {
      const { data } = await createClient()
        .from("goal_projects")
        .select("goal_id, project_id");
      return data ?? [];
    },
    enabled,
  });

  const goalProjectIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const current = map.get(row.goal_id) ?? [];
      current.push(row.project_id);
      map.set(row.goal_id, current);
    }
    return map;
  }, [rows]);

  const projectGoalIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const current = map.get(row.project_id) ?? [];
      current.push(row.goal_id);
      map.set(row.project_id, current);
    }
    return map;
  }, [rows]);

  return { rows, goalProjectIdsMap, projectGoalIdsMap, isLoading };
}

/**
 * Convenience: just the forward map (goalId -> projectId[]).
 * Use this when you only need to look up projects belonging to a goal.
 */
export function useGoalProjectIdsMap(enabled?: boolean): Map<string, string[]> {
  return useGoalProjectRelations({ enabled }).goalProjectIdsMap;
}
