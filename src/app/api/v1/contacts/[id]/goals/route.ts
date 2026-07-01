import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";

const linkGoalSchema = z.object({ goal_id: z.string().uuid() }).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const supabase = await createClient();
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return success({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    if (!request.headers.get("content-type")?.includes("application/json"))
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    const { id } = await params;
    const { goal_id } = await validateBody(request, linkGoalSchema);
    const supabase = await createClient();
    await contactService.linkToGoal(userId, id, goal_id, { supabase });
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return created({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const goalId = new URL(request.url).searchParams.get("goal_id");
    if (!goalId) throw new ValidationError("goal_id is required");
    const supabase = await createClient();
    await contactService.unlinkFromGoal(userId, id, goalId, { supabase });
    const links = await contactService.getGoalLinks(userId, id, { supabase });
    return success({ contact_id: id, goal_ids: links.map((l) => l.goal_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
