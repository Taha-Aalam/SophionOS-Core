import { NextRequest } from "next/server";
import { z } from "zod";
import { noteService } from "@/lib/services/note.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkSchema = z.object({ project_id: z.string().uuid() });

/** GET — project ids linked to the note. */
async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedProjectIds ?? []);
  } catch (err) {
    return error(err);
  }
}

/** POST — link a project to the note. */
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
    const body = await validateBody(request, linkSchema);
    const supabase = await createDataClient(authResult);
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = Array.from(new Set([...relations.project_ids, body.project_id]));
    await noteService.replaceProjectLinks(userId, id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedProjectIds ?? []);
  } catch (err) {
    return error(err);
  }
}

/** DELETE — unlink a project (?project_id=<uuid>). */
async function handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const projectId = new URL(request.url).searchParams.get("project_id");
    if (!projectId) {
      return error(new AppError("Missing required query parameter: project_id", 400, "VALIDATION_ERROR"));
    }
    const supabase = await createDataClient(authResult);
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = relations.project_ids.filter((p) => p !== projectId);
    await noteService.replaceProjectLinks(userId, id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedProjectIds ?? []);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/notes/:id/projects", handleGet);
export const POST = withApiLogging("/api/v1/notes/:id/projects", handlePost);
export const DELETE = withApiLogging("/api/v1/notes/:id/projects", handleDelete);
