import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createTaskSchema } from "@/lib/validators/task.schema";
import { getLocalDateStart } from "@/lib/utils/dates";
import type { Task } from "@/lib/types/domain.types";
import type { TaskStatus } from "@/lib/utils/constants";

function parseBool(value: string | null): boolean {
  return value === "true" || value === "1";
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset, limit } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const areaId = searchParams.get("area_id");
    const projectId = searchParams.get("project_id");
    const goalId = searchParams.get("goal_id");
    const contactId = searchParams.get("contact_id");
    const focused = parseBool(searchParams.get("focused"));
    const overdue = parseBool(searchParams.get("overdue"));
    const upcoming = parseBool(searchParams.get("upcoming"));
    const dueDateFrom = searchParams.get("due_date_from");
    const dueDateTo = searchParams.get("due_date_to");
    const sort = searchParams.get("sort");

    // Choose the most selective base fetch so the status/focused/overdue
    // filters are pushed to the service (the DB) rather than re-derived in
    // memory. Remaining filters are applied as in-memory predicates below.
    let data: Task[];
    if (overdue) {
      data = await taskService.getOverdue(userId, { supabase });
    } else if (focused) {
      data = await taskService.getFocused(userId, { supabase });
    } else if (status) {
      data = await taskService.getByStatus(userId, status as TaskStatus, { supabase });
    } else {
      data = await taskService.list(userId, { supabase });
    }

    // Status post-filter when it wasn't the base fetch (e.g. combined with
    // overdue/focused) so a caller can intersect status with those flags.
    if (status && (overdue || focused)) {
      data = data.filter((task) => task.status === status);
    }

    if (priority) {
      data = data.filter((task) => task.priority === priority);
    }

    if (focused && !overdue) {
      // getFocused already constrained; this is a no-op guard for the
      // overdue+focused combination path.
      data = data.filter((task) => task.is_focused === true);
    }

    if (areaId) {
      data = data.filter(
        (task) => task.area_id === areaId || (task.linkedAreaIds ?? []).includes(areaId),
      );
    }

    if (projectId) {
      data = data.filter(
        (task) =>
          task.project_id === projectId || (task.linkedProjectIds ?? []).includes(projectId),
      );
    }

    if (goalId) {
      data = data.filter((task) => (task.linkedGoalIds ?? []).includes(goalId));
    }

    if (contactId) {
      const { data: links, error: linkError } = await supabase
        .from("contact_tasks")
        .select("task_id")
        .eq("contact_id", contactId);
      if (linkError) throw new AppError(linkError.message);
      const allowed = new Set((links ?? []).map((row) => row.task_id as string));
      data = data.filter((task) => allowed.has(task.id));
    }

    if (dueDateFrom) {
      data = data.filter((task) => task.due_date != null && task.due_date >= dueDateFrom);
    }

    if (dueDateTo) {
      data = data.filter((task) => task.due_date != null && task.due_date <= dueDateTo);
    }

    if (upcoming) {
      // Same local-calendar-date bounds as get_dashboard and get_my_day so
      // all three agree on what counts as "today".
      const todayStart = getLocalDateStart();
      data = data.filter(
        (task) => task.due_date != null && task.due_date >= todayStart && !task.is_completed,
      );
    }

    if (sort === "smart-priority" || sort === "smart_priority") {
      data = [...data].sort((a, b) => (b.smart_priority ?? 0) - (a.smart_priority ?? 0));
    }

    const total = data.length;
    const pageItems = data.slice(offset, offset + limit);
    return paginated(pageItems, total, page, pageSize);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createTaskSchema);
    const supabase = await createDataClient(authResult);
    const task = await taskService.create(userId, body, { supabase });
    return created(task);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
