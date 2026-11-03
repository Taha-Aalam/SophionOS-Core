import { NextRequest } from "next/server";
import { z } from "zod";
import { resourceService } from "@/lib/services/resource.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkBodySchema = z.object({ task_id: z.string().uuid() });

async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    await resourceService.getById(userId, id, { supabase });
    const relations = await resourceService.getWithRelations(id, { supabase });
    return success({ task_ids: relations.task_ids });
  } catch (err) {
    return error(err);
  }
}

async function handlePost(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const { task_id } = await validateBody(request, linkBodySchema);
    const supabase = await createDataClient(authResult);
    await resourceService.getById(userId, id, { supabase });
    const relations = await resourceService.getWithRelations(id, { supabase });
    const next = Array.from(new Set([...relations.task_ids, task_id]));
    await resourceService.replaceTaskLinks(userId, id, next, { supabase });
    return success({ task_ids: next });
  } catch (err) {
    return error(err);
  }
}

async function handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const { task_id } = await validateBody(request, linkBodySchema);
    const supabase = await createDataClient(authResult);
    await resourceService.getById(userId, id, { supabase });
    const relations = await resourceService.getWithRelations(id, { supabase });
    const next = relations.task_ids.filter((t) => t !== task_id);
    await resourceService.replaceTaskLinks(userId, id, next, { supabase });
    return success({ task_ids: next });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/resources/:id/tasks", handleGet);
export const POST = withApiLogging("/api/v1/resources/:id/tasks", handlePost);
export const DELETE = withApiLogging("/api/v1/resources/:id/tasks", handleDelete);
