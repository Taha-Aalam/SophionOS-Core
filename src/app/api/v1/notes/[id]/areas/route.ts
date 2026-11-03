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

const linkSchema = z.object({ area_id: z.string().uuid() });

/** GET — area ids linked to the note. */
async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedAreaIds ?? []);
  } catch (err) {
    return error(err);
  }
}

/** POST — link an area to the note. */
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
    // Assert ownership before mutating the junction.
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = Array.from(new Set([...relations.area_ids, body.area_id]));
    await noteService.replaceAreaLinks(userId, id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedAreaIds ?? []);
  } catch (err) {
    return error(err);
  }
}

/** DELETE — unlink an area (?area_id=<uuid>). */
async function handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const areaId = new URL(request.url).searchParams.get("area_id");
    if (!areaId) {
      return error(new AppError("Missing required query parameter: area_id", 400, "VALIDATION_ERROR"));
    }
    const supabase = await createDataClient(authResult);
    await noteService.getById(userId, id, { supabase });
    const relations = await noteService.getWithRelations(id, { supabase });
    const next = relations.area_ids.filter((a) => a !== areaId);
    await noteService.replaceAreaLinks(userId, id, next, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.linkedAreaIds ?? []);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/notes/:id/areas", handleGet);
export const POST = withApiLogging("/api/v1/notes/:id/areas", handlePost);
export const DELETE = withApiLogging("/api/v1/notes/:id/areas", handleDelete);
