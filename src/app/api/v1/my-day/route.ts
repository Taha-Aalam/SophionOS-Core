import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { getLocalDateKey } from "@/lib/utils/dates";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);

    // Resolve "today" in the user's timezone so dueToday matches their local
    // calendar date regardless of where the server runs. due_date is a DATE
    // column (YYYY-MM-DD), so compare date keys — never full ISO timestamps
    // ("2026-08-03" < "2026-08-03T00:00:00.000Z" lexicographically, which
    // would wrongly exclude every task due today).
    const prefs = await userSettingsService.getPreferences(userId, { supabase });
    const tz = prefs?.timezone;
    const todayKey = getLocalDateKey(tz);
    const tasks = await taskService.list(userId, { supabase });
    const activeTasks = tasks.filter((t) => !t.is_completed);

    const dueToday = activeTasks.filter((t) => t.due_date != null && t.due_date === todayKey);
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
