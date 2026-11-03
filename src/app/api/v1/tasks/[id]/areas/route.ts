import { NextRequest } from "next/server";
import { z } from "zod";
import { taskService } from "@/lib/services/task.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkSchema = z.object({ area_id: z.string().uuid() }).strict();

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate, matching the notes/resources/goals/contacts families.
    await taskService.getById(userId, id, { supabase });
    const areaIds = await taskService.getAreaLinks(userId, id, { supabase });
    return success({ task_id: id, area_ids: areaIds });
  } catch (err) {
    return error(err);
  }
}

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, linkSchema);
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate: the API-key path uses a service-role client that
    // bypasses RLS, so bind the parent task to the caller before mutating.
    await taskService.getById(userId, id, { supabase });
    const existing = await taskService.getAreaLinks(userId, id, { supabase });
    const next = Array.from(new Set([...existing, body.area_id]));
    await taskService.replaceAreaLinks(userId, id, next, { supabase });
    return success({ task_id: id, area_ids: next });
  } catch (err) {
    return error(err);
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, linkSchema);
    const supabase = await createDataClient(authResult);
    // Ownership pre-gate: the API-key path uses a service-role client that
    // bypasses RLS, so bind the parent task to the caller before mutating.
    await taskService.getById(userId, id, { supabase });
    const existing = await taskService.getAreaLinks(userId, id, { supabase });
    const next = existing.filter((areaId) => areaId !== body.area_id);
    await taskService.replaceAreaLinks(userId, id, next, { supabase });
    return success({ task_id: id, area_ids: next });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/tasks/:id/areas", handleGet);
export const POST = withApiLogging("/api/v1/tasks/:id/areas", handlePost);
export const DELETE = withApiLogging("/api/v1/tasks/:id/areas", handleDelete);
