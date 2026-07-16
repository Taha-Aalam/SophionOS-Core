import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import {
  getAccountDeletionRequest,
  requestAccountDeletion,
  processDueAccountDeletion,
  isAccountDeletionDue,
  DELETION_GRACE_DAYS,
} from "@/lib/privacy/account-deletion";

const bodySchema = z.object({
  confirmation: z.string().min(1),
});

/** Honest consequence strings used by API + UI. */
export const ACCOUNT_DELETION_CONSEQUENCES = [
  "API keys are revoked immediately and AI/API access is disabled.",
  "You may cancel during the grace period from Privacy & data.",
  "After the grace period, opening Privacy settings (or calling finalize) runs the product-data purge for your user id.",
  "You can also complete deletion from Privacy & data once the grace period ends (or purge early with an explicit confirmation).",
  "Billing/legal records may be retained as required by law.",
  "Backups may retain data for a provider-defined window after purge.",
] as const;

/** GET current deletion request status (processes due purges first). */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }
    // Run final purge when grace has elapsed (no separate worker required).
    await processDueAccountDeletion(userId);
    const row = await getAccountDeletionRequest(userId);
    const due =
      row?.status === "scheduled" && isAccountDeletionDue(row.scheduled_for);
    return success({
      request: row,
      grace_days: DELETION_GRACE_DAYS,
      grace_elapsed: due,
      can_finalize: due || row?.status === "scheduled",
      consequences: [...ACCOUNT_DELETION_CONSEQUENCES],
    });
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/** POST schedule account deletion after typed confirmation. */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(
        new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"),
      );
    }

    const body = await validateBody(request, bodySchema);
    try {
      const row = await requestAccountDeletion(userId, body.confirmation);
      return created({
        request: row,
        grace_days: DELETION_GRACE_DAYS,
        consequences: [...ACCOUNT_DELETION_CONSEQUENCES],
        message:
          "Deletion scheduled. AI access disabled and API keys revoked immediately. Cancel anytime before the scheduled date. After that date, the product-data purge runs when you open Privacy settings or complete deletion.",
      });
    } catch (e) {
      if (e instanceof Error && e.message === "CONFIRMATION_REQUIRED") {
        throw new ValidationError('Type DELETE in confirmation to proceed');
      }
      throw e;
    }
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
