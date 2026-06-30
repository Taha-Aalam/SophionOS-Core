import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api/api-auth";
import { error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { goalService } from "@/lib/services/goal.service";
import { createClient } from "@/lib/supabase/server";
import { updateGoalSchema } from "@/lib/validators/goal.schema";

/**
 * GET /api/v1/goals/[id] — single goal with progress + rollups hydrated by the
 * service layer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request);

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { id } = await params;
    const supabase = await createClient();
    const goal = await goalService.getById(userId, id, { supabase });
    return success(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * PATCH /api/v1/goals/[id] — partial update. Requires `application/json`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request);

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
    const supabase = await createClient();
    const goal = await goalService.update(userId, id, body, { supabase });
    return success(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * DELETE /api/v1/goals/[id] — permanent delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request);

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { id } = await params;
    const supabase = await createClient();
    await goalService.delete(userId, id, { supabase });
    return success({ id, deleted: true });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
