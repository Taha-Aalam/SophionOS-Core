import { NextRequest } from "next/server";
import { knowledgeService } from "@/lib/services/knowledge.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const supabase = await createClient();
    // Global search currently spans the knowledge surfaces (notes, resources,
    // topics). Reuse the knowledge search aggregation as the single source.
    const results = await knowledgeService.search(userId, q, { supabase });
    return success({
      query: q.trim(),
      results,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
