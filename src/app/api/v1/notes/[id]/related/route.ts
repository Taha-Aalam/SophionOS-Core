import { NextRequest } from "next/server";
import { noteService } from "@/lib/services/note.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

/**
 * Related notes are DERIVED from shared notebook membership — there is no
 * link-related write path. Read-only: returns groups of co-notebook notes.
 */
async function handleGet(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    // Ownership gate: getRelatedByNotebook reads notebook labels by bare
    // note_id, so without this check an API-key caller could probe another
    // user's note's notebook memberships.
    await noteService.getById(userId, id, { supabase });
    const groups = await noteService.getRelatedByNotebook(userId, id, { supabase });
    return success(groups);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/notes/:id/related", handleGet);
