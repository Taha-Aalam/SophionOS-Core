import { NextRequest } from "next/server";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import {
  finalizeAccountDeletion,
  getAccountDeletionRequest,
} from "@/lib/privacy/account-deletion";

/**
 * POST — complete product-data purge for a scheduled deletion.
 * Allowed when grace has elapsed, or early with force:true (user-confirmed).
 * Also invocable by processDueAccountDeletion when Privacy APIs load after due.
 * Session-only; never available to API keys.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const existing = await getAccountDeletionRequest(userId);
    if (!existing || existing.status !== "scheduled") {
      return error(
        new AppError(
          "No scheduled deletion request to finalize",
          400,
          "VALIDATION_ERROR",
        ),
      );
    }

    let force = false;
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        const body = (await request.json()) as { force?: boolean };
        force = body?.force === true;
      }
    } catch {
      /* empty body ok */
    }

    const due = new Date(existing.scheduled_for).getTime() <= Date.now();
    if (!due && !force) {
      return error(
        new AppError(
          "Grace period has not elapsed. To purge early, confirm force:true from Privacy & data.",
          400,
          "GRACE_NOT_ELAPSED",
        ),
      );
    }

    const result = await finalizeAccountDeletion(userId);
    return success({
      ...result,
      forced: force && !due,
      message:
        "Account product data purge completed. Billing records may remain. Sign-out and Clerk user removal may require separate steps.",
    });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
