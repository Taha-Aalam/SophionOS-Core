import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { createDataClient } from "@/lib/supabase/server";
import { exportPersonalDataForUser } from "@/lib/export/personal-data-export";

/**
 * GET /api/v1/user/export
 * Personal data export for the authenticated user (Clerk or API key).
 * Rate limited; does not require paid tier so free users can exercise portability.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, `export:${userId}`);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const supabase = await createDataClient(authResult);
    const payload = await exportPersonalDataForUser(userId, supabase);
    return success(payload);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
