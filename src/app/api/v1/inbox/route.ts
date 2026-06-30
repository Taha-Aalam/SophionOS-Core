import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { noteService } from "@/lib/services/note.service";
import { resourceService } from "@/lib/services/resource.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createClient();

    // Aggregate the inbox across all three capture surfaces. Notes/resources
    // support a server-side status filter; tasks.list has no status predicate
    // so we filter the non-archived list down to inbox here.
    const [tasks, notes, resources] = await Promise.all([
      taskService.list(userId, { supabase }),
      noteService.list(userId, { status: "inbox" }, { supabase }),
      resourceService.list(userId, { status: "inbox" }, { supabase }),
    ]);

    const inboxTasks = tasks.filter((t) => t.status === "inbox");

    return success({
      tasks: inboxTasks,
      notes,
      resources,
      counts: {
        tasks: inboxTasks.length,
        notes: notes.length,
        resources: resources.length,
        total: inboxTasks.length + notes.length + resources.length,
      },
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
