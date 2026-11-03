import type { NextRequest } from "next/server";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { projectService } from "@/lib/services/project.service";
import { createDataClient } from "@/lib/supabase/server";
import { updateProjectSchema } from "@/lib/validators/project.schema";
import { withApiLogging } from "@/lib/api/api-log";

/**
 * GET /api/v1/projects/[id] — single project with relations + progress
 * hydrated by the service layer.
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
    const project = await projectService.getById(userId, id, { supabase, userId });
    return success(project);
  } catch (err) {
    return error(err);
  }
}

/**
 * PATCH /api/v1/projects/[id] — partial update. Requires `application/json`.
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
    const body = await validateBody(request, updateProjectSchema);
    const supabase = await createDataClient(authResult);
    const project = await projectService.update(userId, id, body, { supabase, userId });
    return success(project);
  } catch (err) {
    return error(err);
  }
}

/**
 * DELETE /api/v1/projects/[id] — permanent delete.
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
    await projectService.delete(userId, id, { supabase, userId });
    return success({ id, deleted: true });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/projects/:id", handleGet);
export const PATCH = withApiLogging("/api/v1/projects/:id", handlePatch);
export const DELETE = withApiLogging("/api/v1/projects/:id", handleDelete);
