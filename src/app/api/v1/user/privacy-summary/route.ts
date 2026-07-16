import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { createDataClient } from "@/lib/supabase/server";
import { buildPrivacySummary } from "@/lib/privacy/privacy-summary";
import {
  getAccountDeletionRequest,
  processDueAccountDeletion,
  isAccountDeletionDue,
} from "@/lib/privacy/account-deletion";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    // If grace elapsed, purge product data for this user before summarizing.
    const dueProcess = await processDueAccountDeletion(userId);

    const supabase = await createDataClient(authResult);
    const summary = await buildPrivacySummary(userId, supabase);
    const deletion = await getAccountDeletionRequest(userId);
    const scheduled = deletion && deletion.status === "scheduled";
    const graceElapsed =
      !!scheduled && isAccountDeletionDue(deletion!.scheduled_for);

    return success({
      ...summary,
      deletion_request: scheduled
        ? {
            status: deletion!.status,
            scheduled_for: deletion!.scheduled_for,
            requested_at: deletion!.requested_at,
            grace_elapsed: graceElapsed,
          }
        : deletion?.status === "completed"
          ? {
              status: deletion.status,
              scheduled_for: deletion.scheduled_for,
              requested_at: deletion.requested_at,
              completed_at: deletion.completed_at,
              grace_elapsed: true,
            }
          : null,
      deletion_just_processed: dueProcess.processed,
    });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
