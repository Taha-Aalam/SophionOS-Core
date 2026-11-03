import { NextRequest } from "next/server";
import { dashboardService } from "@/lib/services/dashboard.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

async function handleGet(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const supabase = await createDataClient(authResult);
    const [data, analytics] = await Promise.all([
      dashboardService.getToday(userId, { supabase }),
      dashboardService.getAnalytics(userId, { supabase }),
    ]);
    return success({ ...data, analytics });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/dashboard/today", handleGet);
