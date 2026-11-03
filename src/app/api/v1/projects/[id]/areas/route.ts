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

const linkAreaSchema = z.object({ area_id: z.string().uuid() }).strict();

/**
 * GET /api/v1/projects/[id]/areas — linked area ids for the project.
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
    return success({ area_ids: relations.area_ids });
  } catch (err) {
    return error(err);
  }
}

/**
 * POST /api/v1/projects/[id]/areas — link an area. Requires `application/json`
 * with `{ area_id }`.
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
    const { area_id } = await validateBody(request, linkAreaSchema);
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate before the write (was previously only checked after).
    await projectService.getById(userId, id, { supabase });
    await projectService.linkToArea(userId, id, area_id, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return created(project);
  } catch (err) {
    return error(err);
  }
}

/**
 * DELETE /api/v1/projects/[id]/areas?area_id=... — unlink an area.
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
    const areaId = new URL(request.url).searchParams.get("area_id");
    if (!areaId) {
      throw new ValidationError("area_id is required");
    }
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate before the write (was previously only checked after).
    await projectService.getById(userId, id, { supabase });
    await projectService.unlinkFromArea(userId, id, areaId, { supabase, userId });
    const project = await projectService.getById(userId, id, { supabase, userId });
    return success(project);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/projects/:id/areas", handleGet);
export const POST = withApiLogging("/api/v1/projects/:id/areas", handlePost);
export const DELETE = withApiLogging("/api/v1/projects/:id/areas", handleDelete);
