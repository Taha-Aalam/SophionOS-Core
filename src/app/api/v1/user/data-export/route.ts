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

/**
 * POST — request personal data export (dashboard session only).
 * Beta: synchronous capped export; result stored on job row when table exists.
 */
export async function POST(request: NextRequest) {
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
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/** GET — list recent export jobs for the user (metadata only). */
export async function GET(request: NextRequest) {
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
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
