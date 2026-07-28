import type { NextRequest } from "next/server";
import { z } from "zod";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { created, error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { projectService } from "@/lib/services/project.service";
import { createDataClient } from "@/lib/supabase/server";

const linkGoalSchema = z.object({ goal_id: z.string().uuid() }).strict();

/**
 * GET /api/v1/projects/[id]/goals — linked goal ids (and names) for the
 * project.
 */
export async function GET(
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
    const relations = await projectService.getWithRelations(userId, id, {
      supabase, userId,
    });
    return success({ goal_ids: relations.goal_ids, goals: relations.goals });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * POST /api/v1/projects/[id]/goals — link a goal. Requires `application/json`
 * with `{ goal_id }`.
 */
export async function POST(
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
    const { goal_id } = await validateBody(request, linkGoalSchema);
    const supabase = await createDataClient(authResult);
    await projectService.linkToGoal(userId, id, goal_id, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return created(project);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * DELETE /api/v1/projects/[id]/goals?goal_id=... — unlink a goal.
 */
export async function DELETE(
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
    const goalId = new URL(request.url).searchParams.get("goal_id");
    if (!goalId) {
      throw new ValidationError("goal_id is required");
    }
    const supabase = await createDataClient(authResult);
    await projectService.unlinkFromGoal(userId, id, goalId, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return success(project);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
