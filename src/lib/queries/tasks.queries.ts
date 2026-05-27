import type { SupabaseClient } from "@supabase/supabase-js";

import { TASK_SELECT } from "@/lib/services/task.service";
import type { Task } from "@/lib/types/domain.types";

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((id): id is string => Boolean(id))));
}

function isMissingTaskAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("task_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

/**
 * Server-side fetch for the tasks list query. Mirrors `taskService.list`
 * (incl. its `task_areas` and `goal_tasks` hydration) so the SSR-prefetched
 * cache lands on the client with `linkedAreaIds` and `linkedGoalIds`
 * already populated.
 *
 * Without this, the React-Query cache hydrates with un-hydrated tasks and
 * (because the global query provider sets `refetchOnMount: false`) the
 * client does not refetch until an explicit invalidation. That manifested
 * as: goal bubbles missing on first load, all tasks under "No Goal" in the
 * by-goal tab, until the user edited any task.
 */
export async function serverFetchTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const tasks = data ?? [];
  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map((t) => t.id);

  const [taskAreasResult, goalTasksResult, taskProjectsResult] = await Promise.all([
    supabase.from("task_areas").select("task_id, area_id").in("task_id", taskIds),
    supabase.from("goal_tasks").select("task_id, goal_id").in("task_id", taskIds),
    supabase.from("task_projects").select("task_id, project_id").in("task_id", taskIds),
  ]);

  const areaIdsByTaskId = new Map<string, string[]>();
  if (!taskAreasResult.error || !isMissingTaskAreasTableError(taskAreasResult.error)) {
    for (const row of (taskAreasResult.data ?? []) as Array<{ task_id: string; area_id: string }>) {
      const current = areaIdsByTaskId.get(row.task_id) ?? [];
      current.push(row.area_id);
      areaIdsByTaskId.set(row.task_id, current);
    }
  }

  const goalIdsByTaskId = new Map<string, string[]>();
  for (const row of (goalTasksResult.data ?? []) as Array<{ task_id: string; goal_id: string }>) {
    const current = goalIdsByTaskId.get(row.task_id) ?? [];
    current.push(row.goal_id);
    goalIdsByTaskId.set(row.task_id, current);
  }

  // task_projects may not exist in databases that haven't run the multi-project migration.
  // Treat any error as "no junction rows" rather than throwing — primary project_id remains
  // the source of truth in that case.
  const projectIdsByTaskId = new Map<string, string[]>();
  if (!taskProjectsResult.error) {
    for (const row of (taskProjectsResult.data ?? []) as Array<{
      task_id: string;
      project_id: string;
    }>) {
      const current = projectIdsByTaskId.get(row.task_id) ?? [];
      current.push(row.project_id);
      projectIdsByTaskId.set(row.task_id, current);
    }
  }

  return tasks.map((task) => ({
    ...task,
    linkedAreaIds: dedupeAreaIds([task.area_id, ...(areaIdsByTaskId.get(task.id) ?? [])]),
    linkedGoalIds: goalIdsByTaskId.get(task.id) ?? [],
    linkedProjectIds: Array.from(
      new Set(
        [task.project_id, ...(projectIdsByTaskId.get(task.id) ?? [])].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ),
  })) as Task[];
}
