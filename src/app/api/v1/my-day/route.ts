import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);

    // "My Day" is the user's focused task list. taskService.list already
    // excludes archived; narrow to focused tasks here.
    const tasks = await taskService.list(userId, { supabase });
    const focusTasks = tasks.filter((t) => t.is_focused);

    return success({
      tasks: focusTasks,
      count: focusTasks.length,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
