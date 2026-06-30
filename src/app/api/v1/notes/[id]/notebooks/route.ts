import { NextRequest } from "next/server";
import { z } from "zod";
import { noteService } from "@/lib/services/note.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const replaceSchema = z.object({
  notebooks: z.array(z.string().min(1).max(100)),
});
const addSchema = z.object({
  notebook: z.string().min(1).max(100),
});

/** GET — the note's current notebook memberships. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createClient();
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** PUT — replace the full notebook membership set. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, replaceSchema);
    const supabase = await createClient();
    await noteService.replaceNotebooks(id, body.notebooks, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** POST — add the note to a single notebook. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, addSchema);
    const supabase = await createClient();
    await noteService.addNotesToNotebook(userId, body.notebook, [id], { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** DELETE — remove the note from a notebook (?notebook=<name>). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const notebook = new URL(request.url).searchParams.get("notebook");
    if (!notebook) {
      return error(new AppError("Missing required query parameter: notebook", 400, "VALIDATION_ERROR"));
    }
    const supabase = await createClient();
    await noteService.removeNoteFromNotebook(userId, id, notebook, { supabase });
    const note = await noteService.getById(userId, id, { supabase });
    return success(note.notebooks ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
