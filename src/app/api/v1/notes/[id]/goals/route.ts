import { NextRequest } from "next/server";
import { z } from "zod";
import { noteService } from "@/lib/services/note.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const linkSchema = z.object({ goal_id: z.string().uuid() });

/** GET — goal ids linked to the note. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createClient();
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedGoalIds ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** POST — link a goal to the note. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, linkSchema);
    const supabase = await createClient();
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = Array.from(new Set([...relations.goal_ids, body.goal_id]));
    await noteService.replaceGoalLinks(id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedGoalIds ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** DELETE — unlink a goal (?goal_id=<uuid>). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const goalId = new URL(request.url).searchParams.get("goal_id");
    if (!goalId) {
      return error(new AppError("Missing required query parameter: goal_id", 400, "VALIDATION_ERROR"));
    }
    const supabase = await createClient();
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = relations.goal_ids.filter((g) => g !== goalId);
    await noteService.replaceGoalLinks(id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedGoalIds ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
