import { NextRequest } from "next/server";
import { topicService } from "@/lib/services/topic.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createTopicSchema } from "@/lib/validators/topic.schema";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);
    const opts = { supabase };

    // grouped=true returns topics grouped by area.
    if (searchParams.get("grouped") === "true") {
      const groups = await topicService.getGroupedByArea(userId, opts);
      return paginated(groups, groups.length, page, pageSize);
    }

    // Dedicated filter methods (list always enriches with counts).
    let data;
    if (searchParams.get("archive") === "true") {
      data = await topicService.listArchived(userId, opts);
    } else if (searchParams.get("favorite") === "true") {
      data = await topicService.getFavorite(userId, opts);
    } else if (searchParams.get("inactive") === "true") {
      data = await topicService.getInactive(userId, opts);
    } else {
      data = await topicService.list(userId, opts);
    }

    return paginated(data, data.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createTopicSchema);
    const supabase = await createDataClient(authResult);
    const topic = await topicService.create(userId, body, { supabase });
    return created(topic);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
