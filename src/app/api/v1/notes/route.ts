import { NextRequest } from "next/server";
import { noteService } from "@/lib/services/note.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createNoteSchema } from "@/lib/validators/note.schema";
import type { NoteStatus } from "@/lib/utils/constants";
import type { Note } from "@/lib/types/domain.types";

function parseBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Groups notes by the requested dimension. `notebook` fans a note out across
 * every notebook it belongs to; `status`/`type` use the single scalar field.
 */
function buildGroups(notes: Note[], groupBy: string): Array<{ key: string; notes: Note[] }> {
  const map = new Map<string, Note[]>();
  for (const note of notes) {
    let keys: string[];
    if (groupBy === "notebook") {
      keys = note.notebooks && note.notebooks.length > 0 ? note.notebooks : ["(none)"];
    } else if (groupBy === "status") {
      keys = [note.status];
    } else if (groupBy === "type") {
      keys = [note.type ?? "(none)"];
    } else {
      keys = ["all"];
    }
    for (const key of keys) {
      const arr = map.get(key) ?? [];
      arr.push(note);
      map.set(key, arr);
    }
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, notes: items }));
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);

    const notebook = searchParams.get("notebook");
    const goalId = searchParams.get("goal_id");
    const topicId = searchParams.get("topic_id");
    const projectId = searchParams.get("project_id");
    const areaId = searchParams.get("area_id");
    const status = searchParams.get("status");
    const favorite = parseBool(searchParams.get("favorite"));
    const pinned = parseBool(searchParams.get("pinned"));
    const type = searchParams.get("type");
    const groupBy = searchParams.get("group_by");

    // Pick the most specific service read. Junction-backed reads
    // (notebook/goal/topic/project) don't accept status/favorite, so those
    // get post-filtered below; the default list path pushes them into the query.
    let notes: Note[];
    let serviceAppliedStatusFavorite = false;
    if (notebook) {
      notes = await noteService.getByNotebook(userId, notebook, { supabase });
    } else if (goalId) {
      notes = await noteService.listByGoal(userId, goalId, { supabase });
    } else if (topicId) {
      notes = await noteService.listByTopic(userId, topicId, { supabase });
    } else if (projectId) {
      notes = await noteService.listByProject(userId, projectId, { supabase });
    } else {
      notes = await noteService.list(
        userId,
        {
          status: (status ?? undefined) as NoteStatus | "all" | undefined,
          favorite,
          areaId: areaId ?? undefined,
        },
        { supabase },
      );
      serviceAppliedStatusFavorite = true;
    }

    if (!serviceAppliedStatusFavorite) {
      if (status) notes = notes.filter((n) => n.status === status);
      if (favorite !== undefined) notes = notes.filter((n) => n.favorite === favorite);
    }
    if (pinned !== undefined) notes = notes.filter((n) => n.pin === pinned);
    if (type) notes = notes.filter((n) => n.type === type);

    if (groupBy) {
      const groups = buildGroups(notes, groupBy);
      return paginated(groups, groups.length, page, pageSize);
    }

    return paginated(notes, notes.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createNoteSchema);
    const supabase = await createDataClient(authResult);
    const note = await noteService.create(userId, body, { supabase });
    return created(note);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
