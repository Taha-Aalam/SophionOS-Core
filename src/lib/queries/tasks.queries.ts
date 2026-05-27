import type { SupabaseClient } from "@supabase/supabase-js";

import { TASK_SELECT } from "@/lib/services/task.service";
import type { Task } from "@/lib/types/domain.types";

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((id): id is string => Boolean(id))));
}

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

  // Hydrate goal links
  const { data: goalRows } = await supabase
    .from("goal_tasks")
    .select("task_id, goal_id")
    .in("task_id", taskIds);

  const goalIdsByTaskId = new Map<string, string[]>();
  for (const row of goalRows ?? []) {
    const current = goalIdsByTaskId.get(row.task_id) ?? [];
    current.push(row.goal_id);
    goalIdsByTaskId.set(row.task_id, current);
  }

  // Hydrate area links (from task_areas junction table)
  const areaIdsByTaskId = new Map<string, string[]>();
  try {
    const { data: areaRows, error: areaError } = await supabase
      .from("task_areas")
      .select("task_id, area_id")
      .in("task_id", taskIds);

    if (!areaError) {
      for (const row of areaRows ?? []) {
        const current = areaIdsByTaskId.get(row.task_id) ?? [];
        current.push(row.area_id);
        areaIdsByTaskId.set(row.task_id, current);
      }
    }
    // Gracefully handle missing task_areas table (pre-migration environments)
  } catch {
    // task_areas may not exist yet; fall back to primary area_id only
  }

  return tasks.map((task) => ({
    ...task,
    linkedGoalIds: goalIdsByTaskId.get(task.id) ?? [],
    linkedAreaIds: dedupeAreaIds([task.area_id, ...(areaIdsByTaskId.get(task.id) ?? [])]),
  }));
}
