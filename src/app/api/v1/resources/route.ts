import { NextRequest } from "next/server";
import { resourceService } from "@/lib/services/resource.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createResourceSchema } from "@/lib/validators/resource.schema";
import type { Resource } from "@/lib/types/domain.types";
import type { ResourceStatus } from "@/lib/utils/constants";

function parseBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

// Resolve the scalar value a resource should be grouped under for a given
// `group_by` key. Returns a stable string bucket name.
function resolveGroupKey(resource: Resource, groupBy: string): string {
  switch (groupBy) {
    case "status":
      return resource.status ?? "ungrouped";
    case "type":
      return resource.type ?? "ungrouped";
    case "area_id":
      return resource.area_id ?? "ungrouped";
    case "topic_id":
      return resource.topic_id ?? "ungrouped";
    case "favorite":
      return resource.favorite ? "favorite" : "not_favorite";
    default:
      return "ungrouped";
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);

    const status = searchParams.get("status") as ResourceStatus | "all" | null;
    const favorite = parseBool(searchParams.get("favorite"));
    const type = searchParams.get("type");
    const areaId = searchParams.get("area_id") ?? undefined;
    const goalId = searchParams.get("goal_id") ?? undefined;
    const projectId = searchParams.get("project_id") ?? undefined;
    const topicId = searchParams.get("topic_id") ?? undefined;
    const groupBy = searchParams.get("group_by");

    // goal links are queried through the goal_resources junction, not the
    // flat resources predicate, so they have a dedicated service path.
    let data = goalId
      ? await resourceService.listByGoal(userId, goalId, { supabase })
      : await resourceService.list(
          userId,
          {
            ...(status ? { status } : {}),
            ...(favorite !== undefined ? { favorite } : {}),
            ...(areaId ? { areaId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(topicId ? { topicId } : {}),
          },
          { supabase },
        );

    // resourceService.list has no `type` predicate; post-filter when requested.
    if (type) {
      data = data.filter((resource) => resource.type === type);
    }

    if (groupBy) {
      const buckets = new Map<string, Resource[]>();
      for (const resource of data) {
        const key = resolveGroupKey(resource, groupBy);
        const current = buckets.get(key) ?? [];
        current.push(resource);
        buckets.set(key, current);
      }
      const grouped = Array.from(buckets.entries()).map(([key, resources]) => ({
        key,
        resources,
      }));
      return paginated(grouped, grouped.length, page, pageSize);
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

    const body = await validateBody(request, createResourceSchema);
    const supabase = await createDataClient(authResult);
    const resource = await resourceService.create(userId, body, { supabase });
    return created(resource);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
