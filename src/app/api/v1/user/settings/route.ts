import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const noteDefaultsSchema = z.object({
  default_status: z.enum(["inbox", "to_review", "active"]).optional(),
  default_type: z.enum(["note", "research", "journal"]).optional(),
  default_notebook: z.string().nullable().optional(),
});

const updateSettingsSchema = z.object({
  note_defaults: noteDefaultsSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createClient();
    const noteDefaults = await userSettingsService.getNoteDefaults(userId, { supabase });
    return success({ note_defaults: noteDefaults });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, updateSettingsSchema);
    const supabase = await createClient();

    if (body.note_defaults !== undefined) {
      await userSettingsService.setNoteDefaults(userId, body.note_defaults, { supabase });
    }

    const noteDefaults = await userSettingsService.getNoteDefaults(userId, { supabase });
    return success({ note_defaults: noteDefaults });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
