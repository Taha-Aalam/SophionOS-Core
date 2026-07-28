import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const noteDefaultsSchema = z.object({
  default_status: z.enum(["inbox", "to_review", "active"]).optional(),
  default_type: z.enum(["note", "research", "journal"]).optional(),
  default_notebook: z.string().nullable().optional(),
});

const preferencesSchema = z.object({
  timezone: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().optional(),
});

const notificationsSchema = z.object({
  morning_briefing_enabled: z.boolean().optional(),
  morning_briefing_time: z.string().nullable().optional(),
  evening_review_enabled: z.boolean().optional(),
  evening_review_time: z.string().nullable().optional(),
  weekly_digest_day: z.number().int().min(0).max(6).nullable().optional(),
  email_enabled: z.boolean().optional(),
});

const onboardingSchema = z.object({
  completed: z.boolean(),
  current_step: z.enum([
    "areas",
    "goal",
    "project",
    "tasks",
    "notes",
    "resources",
    "contacts",
  ]),
  draft: z.record(z.string(), z.unknown()).optional(),
  completed_at: z.string().nullable().optional(),
});

const updateSettingsSchema = z.object({
  note_defaults: noteDefaultsSchema.optional(),
  preferences: preferencesSchema.optional(),
  notifications: notificationsSchema.optional(),
  onboarding: onboardingSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);
    const [noteDefaults, preferences, notifications, onboarding] =
      await Promise.all([
        userSettingsService.getNoteDefaults(userId, { supabase }),
        userSettingsService.getPreferences(userId, { supabase }),
        userSettingsService.getNotifications(userId, { supabase }),
        userSettingsService.getOnboardingState(userId, { supabase }),
      ]);
    return success({
      note_defaults: noteDefaults,
      preferences,
      notifications,
      onboarding,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, updateSettingsSchema);
    const supabase = await createDataClient(authResult);

    if (body.note_defaults !== undefined) {
      await userSettingsService.setNoteDefaults(userId, body.note_defaults, { supabase });
    }
    if (body.preferences !== undefined) {
      await userSettingsService.setPreferences(userId, body.preferences, { supabase });
    }
    if (body.notifications !== undefined) {
      await userSettingsService.setNotifications(userId, body.notifications, { supabase });
    }
    if (body.onboarding !== undefined) {
      await userSettingsService.setOnboardingState(userId, body.onboarding, { supabase });
    }

    const [noteDefaults, preferences, notifications, onboarding] =
      await Promise.all([
        userSettingsService.getNoteDefaults(userId, { supabase }),
        userSettingsService.getPreferences(userId, { supabase }),
        userSettingsService.getNotifications(userId, { supabase }),
        userSettingsService.getOnboardingState(userId, { supabase }),
      ]);
    return success({
      note_defaults: noteDefaults,
      preferences,
      notifications,
      onboarding,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
