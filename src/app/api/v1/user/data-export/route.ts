import { NextRequest } from "next/server";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { createDataClient } from "@/lib/supabase/server";
import {
  exportPersonalDataForUser,
  createAndCompleteSyncExportJob,
  assertExportHasNoSecrets,
} from "@/lib/export/personal-data-export";
import { recordAuditEvent } from "@/lib/audit/audit-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiLogging } from "@/lib/api/api-log";

/**
 * POST — request personal data export (dashboard session only).
 * Beta: synchronous capped export; result stored on job row when table exists.
 */
async function handlePost(request: NextRequest) {
  try {
    const authResult = await requireClerkSession(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, `export:${userId}`);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const supabase = await createDataClient(authResult);
    const payload = await exportPersonalDataForUser(userId, supabase);
    assertExportHasNoSecrets(payload);
    const job = await createAndCompleteSyncExportJob(userId, payload);

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      eventType: "privacy",
      action: "export_completed",
      metadata: {
        job_id: job.id,
        entity_counts: payload.meta.counts,
      },
    });

    return created({
      id: job.id,
      status: job.status,
      // Inline download for beta (no signed URL storage dependency).
      data: job.payload,
      note: "Beta export is synchronous. Archive download URLs may replace inline payloads later. Do not share this file.",
    });
  } catch (err) {
    return error(err);
  }
}

/** GET — list recent export jobs for the user (metadata only). */
async function handleGet(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { data, error: qErr } = await createAdminClient()
      .from("data_export_jobs")
      .select("id, status, requested_at, completed_at, expires_at, error_code")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(10);

    if (qErr) {
      return success({ jobs: [] });
    }
    return success({ jobs: data ?? [] });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/user/data-export", handleGet);
export const POST = withApiLogging("/api/v1/user/data-export", handlePost);
