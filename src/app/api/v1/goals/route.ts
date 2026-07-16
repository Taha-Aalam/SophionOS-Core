import type { NextRequest } from "next/server";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { created, error, paginated } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError } from "@/lib/api/error-handler";
import { getPaginationParams } from "@/lib/api/pagination";
import { rateLimit } from "@/lib/api/rate-limiter";
import { goalService } from "@/lib/services/goal.service";
import { createDataClient } from "@/lib/supabase/server";
import { createGoalSchema } from "@/lib/validators/goal.schema";
import type {
  GoalStatusFilter,
  GoalTermFilter,
} from "@/lib/utils/goals";

function isTruthy(value: string | null): boolean {
  return value === "true" || value === "1";
}

/**
 * GET /api/v1/goals — paginated list. Filters: `term` (short/mid/long),
 * `status`, `area_id`, `priority`, and the boolean shortcuts `archive`,
 * `inactive`, `completed` (which map onto the status filter when no explicit
 * `status` is given). The service returns the full (capped) result set, so
 * pagination is applied in-memory here.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const supabase = await createDataClient(authResult);
    const searchParams = new URL(request.url).searchParams;

    const termParam = searchParams.get("term");
    const term: GoalTermFilter | undefined =
      termParam === "short" || termParam === "mid" || termParam === "long"
        ? termParam
        : undefined;

    const areaId = searchParams.get("area_id") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;

    let status = searchParams.get("status") ?? undefined;
    if (!status) {
      if (isTruthy(searchParams.get("archive"))) {
        status = "archived";
      } else if (isTruthy(searchParams.get("completed"))) {
        status = "completed";
      } else if (isTruthy(searchParams.get("inactive"))) {
        status = "inactive";
      }
    }

    const goals = await goalService.list(
      userId,
      {
        term,
        priority,
        areaId,
        status: status as GoalStatusFilter | undefined,
      },
      { supabase },
    );

    const { page, pageSize, offset, limit } = getPaginationParams(searchParams);
    const pageItems = goals.slice(offset, offset + limit);
    return paginated(pageItems, goals.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * POST /api/v1/goals — create a goal. Requires `application/json`.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return error(
        new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"),
      );
    }

    const body = await validateBody(request, createGoalSchema);
    const supabase = await createDataClient(authResult);
    const goal = await goalService.create(userId, body, { supabase });
    return created(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
