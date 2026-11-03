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

const replaceSchema = z.object({
  notebooks: z.array(z.string().min(1).max(100)),
});
const addSchema = z.object({
  notebook: z.string().min(1).max(100),
});

/** GET — the note's current notebook memberships. */
async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return error(err);
  }
}

/** PUT — replace the full notebook membership set. */
async function handlePut(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, replaceSchema);
    const supabase = await createDataClient(authResult);
    // replaceNotebooks now ownership-checks the note itself (assertOwnedIds);
    // getById keeps the same 404-first behavior for missing notes.
    await noteService.getById(userId, id, { supabase });
    await noteService.replaceNotebooks(userId, id, body.notebooks, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return error(err);
  }
}

/** POST — add the note to a single notebook. */
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
    const body = await validateBody(request, addSchema);
    const supabase = await createDataClient(authResult);
    await noteService.addNotesToNotebook(userId, body.notebook, [id], { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return error(err);
  }
}

/** DELETE — remove the note from a notebook (?notebook=<name>). */
async function handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const notebook = new URL(request.url).searchParams.get("notebook");
    if (!notebook) {
      return error(new AppError("Missing required query parameter: notebook", 400, "VALIDATION_ERROR"));
    }
    const supabase = await createDataClient(authResult);
    await noteService.removeNoteFromNotebook(userId, id, notebook, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/notes/:id/notebooks", handleGet);
export const POST = withApiLogging("/api/v1/notes/:id/notebooks", handlePost);
export const PUT = withApiLogging("/api/v1/notes/:id/notebooks", handlePut);
export const DELETE = withApiLogging("/api/v1/notes/:id/notebooks", handleDelete);
