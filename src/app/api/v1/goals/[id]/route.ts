import type { NextRequest } from "next/server";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { goalService } from "@/lib/services/goal.service";
import { createDataClient } from "@/lib/supabase/server";
import { updateGoalSchema } from "@/lib/validators/goal.schema";
import { withApiLogging } from "@/lib/api/api-log";

/**
 * GET /api/v1/goals/[id] — single goal with progress + rollups hydrated by the
 * service layer.
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const goal = await goalService.getById(userId, id, { supabase });
    return success(goal);
  } catch (err) {
    return error(err);
  }
}

/**
 * PATCH /api/v1/goals/[id] — partial update. Requires `application/json`.
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await validateBody(request, updateGoalSchema);
    const supabase = await createDataClient(authResult);
    const goal = await goalService.update(userId, id, body, { supabase });
    return success(goal);
  } catch (err) {
    return error(err);
  }
}

/**
 * DELETE /api/v1/goals/[id] — permanent delete.
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    await goalService.delete(userId, id, { supabase });
    return success({ id, deleted: true });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/goals/:id", handleGet);
export const PATCH = withApiLogging("/api/v1/goals/:id", handlePatch);
export const DELETE = withApiLogging("/api/v1/goals/:id", handleDelete);
