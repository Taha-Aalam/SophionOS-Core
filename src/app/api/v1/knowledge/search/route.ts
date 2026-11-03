import { NextRequest } from "next/server";
import { knowledgeService } from "@/lib/services/knowledge.service";
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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const supabase = await createDataClient(authResult);
    const results = await knowledgeService.search(userId, q, { supabase });
    return success(results);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/knowledge/search", handleGet);
