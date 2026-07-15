import type { NextRequest } from "next/server";
import { z } from "zod";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { created, error, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { goalService } from "@/lib/services/goal.service";
import { createDataClient } from "@/lib/supabase/server";

const linkAreaSchema = z.object({ area_id: z.string().uuid() }).strict();

/**
 * GET /api/v1/goals/[id]/areas — linked area ids for the goal.
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
    // Scope to the caller — getById throws NotFound if the goal isn't theirs.
    await goalService.getById(userId, id, { supabase });
    const areaIds = await goalService.getLinkedAreaIds(id, { supabase });
    return success({ area_ids: areaIds });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * POST /api/v1/goals/[id]/areas — link an area to the goal. Requires
 * `application/json` with `{ area_id }`.
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
    const { area_id } = await validateBody(request, linkAreaSchema);
    const supabase = await createDataClient(authResult);
    const goal = await goalService.linkToArea(userId, id, area_id, { supabase });
    return created(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * DELETE /api/v1/goals/[id]/areas?area_id=... — unlink an area from the goal.
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
    const areaId = new URL(request.url).searchParams.get("area_id");
    if (!areaId) {
      throw new ValidationError("area_id is required");
    }
    const supabase = await createDataClient(authResult);
    const goal = await goalService.unlinkFromArea(userId, id, areaId, {
      supabase,
    });
    return success(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
