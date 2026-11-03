import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkBodySchema = z.object({
  task_id: z.string().uuid(),
  role_in_task: z.string().max(255).optional(),
});

async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const links = await contactService.getTaskLinks(userId, id, { supabase });
    return success(links);
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
    const { task_id, role_in_task } = await validateBody(request, linkBodySchema);
    const supabase = await createDataClient(authResult);
    await contactService.linkToTask(userId, id, task_id, role_in_task, { supabase });
    const links = await contactService.getTaskLinks(userId, id, { supabase });
    return success(links);
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
    await contactService.unlinkFromTask(userId, id, task_id, { supabase });
    const links = await contactService.getTaskLinks(userId, id, { supabase });
    return success(links);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/contacts/:id/tasks", handleGet);
export const POST = withApiLogging("/api/v1/contacts/:id/tasks", handlePost);
export const DELETE = withApiLogging("/api/v1/contacts/:id/tasks", handleDelete);
