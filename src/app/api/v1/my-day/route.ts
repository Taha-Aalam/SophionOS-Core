import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { getLocalDateEnd, getLocalDateStart } from "@/lib/utils/dates";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);

    // "My Day" mirrors the web app: dueToday + focused. taskService.list
    // already excludes archived; narrow to active tasks, then split.
    // "today" uses the same local-calendar-date bounds as get_dashboard and
    // list_tasks date filters.
    const todayStart = getLocalDateStart();
    const todayEnd = getLocalDateEnd();
    const tasks = await taskService.list(userId, { supabase });
    const activeTasks = tasks.filter((t) => !t.is_completed);

    const dueToday = activeTasks.filter(
      (t) => t.due_date != null && t.due_date >= todayStart && t.due_date <= todayEnd,
    );
    const dueTodayIds = new Set(dueToday.map((t) => t.id));
    const focused = activeTasks.filter((t) => t.is_focused && !dueTodayIds.has(t.id));

    return success({
      // New shape: two sections, each with its own count.
      dueToday,
      dueTodayCount: dueToday.length,
      focused,
      focusedCount: focused.length,
      // Backwards-compatible aliases (focused list).
      tasks: focused,
      count: focused.length,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
