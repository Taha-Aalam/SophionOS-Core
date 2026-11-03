import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkGoalSchema = z.object({ goal_id: z.string().uuid() }).strict();

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
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return success({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
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
    if (!request.headers.get("content-type")?.includes("application/json"))
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    const { id } = await params;
    const { goal_id } = await validateBody(request, linkGoalSchema);
    const supabase = await createDataClient(authResult);
    await contactService.linkToGoal(userId, id, goal_id, { supabase });
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return created({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
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
    const goalId = new URL(request.url).searchParams.get("goal_id");
    if (!goalId) throw new ValidationError("goal_id is required");
    const supabase = await createDataClient(authResult);
    await contactService.unlinkFromGoal(userId, id, goalId, { supabase });
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return success({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/contacts/:id/goals", handleGet);
export const POST = withApiLogging("/api/v1/contacts/:id/goals", handlePost);
export const DELETE = withApiLogging("/api/v1/contacts/:id/goals", handleDelete);
