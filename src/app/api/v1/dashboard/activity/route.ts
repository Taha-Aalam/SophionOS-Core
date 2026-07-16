import { NextRequest } from "next/server";
import { dashboardService } from "@/lib/services/dashboard.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);
    // dashboardService.getToday computes recentActivity internally; surface only
    // that slice for the dedicated activity feed endpoint.
    const today = await dashboardService.getToday(userId, { supabase });
    return success(today.recentActivity);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
