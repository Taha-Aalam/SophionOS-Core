import { NextRequest } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { updateTaskSchema } from "@/lib/validators/task.schema";
import { withApiLogging } from "@/lib/api/api-log";

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
    const task = await taskService.getById(userId, id, { supabase });
    return success(task);
  } catch (err) {
    return error(err);
  }
}

async function handlePatch(
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
    const body = await validateBody(request, updateTaskSchema);
    const supabase = await createDataClient(authResult);
    const task = await taskService.update(userId, id, body, { supabase });
    return success(task);
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

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    await taskService.permanentDelete(userId, id, { supabase });
    return success({ id, deleted: true });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/tasks/:id", handleGet);
export const PATCH = withApiLogging("/api/v1/tasks/:id", handlePatch);
export const DELETE = withApiLogging("/api/v1/tasks/:id", handleDelete);
