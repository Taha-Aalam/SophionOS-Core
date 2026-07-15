import type { NextRequest } from "next/server";

import { authorizeApiRequest } from "@/lib/api/api-auth";
import { error, success } from "@/lib/api/api-response";
import { AppError } from "@/lib/api/error-handler";
import { rateLimit } from "@/lib/api/rate-limiter";
import { goalService } from "@/lib/services/goal.service";
import { createDataClient } from "@/lib/supabase/server";

/**
 * POST /api/v1/goals/[id]/restore — restore an archived goal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const goal = await goalService.restore(userId, id, { supabase });
    return success(goal);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
