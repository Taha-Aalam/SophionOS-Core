import { NextRequest } from "next/server";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { cancelAccountDeletion } from "@/lib/privacy/account-deletion";
import { withApiLogging } from "@/lib/api/api-log";

async function handlePost(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const row = await cancelAccountDeletion(userId);
    if (!row) {
      return error(
        new AppError("No scheduled deletion to cancel", 404, "NOT_FOUND"),
      );
    }
    return success({
      request: row,
      message:
        "Deletion cancelled. AI access re-enabled; create new API keys if needed.",
    });
  } catch (err) {
    return error(err);
  }
}

export const POST = withApiLogging("/api/v1/user/account-deletion/cancel", handlePost);
