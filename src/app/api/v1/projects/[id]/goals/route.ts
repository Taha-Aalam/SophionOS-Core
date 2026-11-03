import type { NextRequest } from "next/server";
import { z } from "zod";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { created, error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { projectService } from "@/lib/services/project.service";
import { createDataClient } from "@/lib/supabase/server";
import { withApiLogging } from "@/lib/api/api-log";

const linkGoalSchema = z.object({ goal_id: z.string().uuid() }).strict();

/**
 * GET /api/v1/projects/[id]/goals — linked goal ids (and names) for the
 * project.
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
    // Ownership pre-gate, matching the notes/resources/goals/contacts families.
    await projectService.getById(userId, id, { supabase });
    const relations = await projectService.getWithRelations(userId, id, {
      supabase,
    });
    return success({ goal_ids: relations.goal_ids, goals: relations.goals });
  } catch (err) {
    return error(err);
  }
}

/**
 * POST /api/v1/projects/[id]/goals — link a goal. Requires `application/json`
 * with `{ goal_id }`.
 */
async function handlePost(
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
    // Ownership pre-gate before the write (was previously only checked after).
    await projectService.getById(userId, id, { supabase });
    await projectService.linkToGoal(userId, id, goal_id, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return created(project);
  } catch (err) {
    return error(err);
  }
}

/**
 * DELETE /api/v1/projects/[id]/goals?goal_id=... — unlink a goal.
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
    const goalId = new URL(request.url).searchParams.get("goal_id");
    if (!goalId) {
      throw new ValidationError("goal_id is required");
    }
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate before the write (was previously only checked after).
    await projectService.getById(userId, id, { supabase });
    await projectService.unlinkFromGoal(userId, id, goalId, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return success(project);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/projects/:id/goals", handleGet);
export const POST = withApiLogging("/api/v1/projects/:id/goals", handlePost);
export const DELETE = withApiLogging("/api/v1/projects/:id/goals", handleDelete);
