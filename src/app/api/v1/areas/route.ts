import { NextRequest } from "next/server";
import { areaService } from "@/lib/services/area.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createAreaSchema } from "@/lib/validators/area.schema";

function parseBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
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

    // grouped=true returns areas grouped by type (one group per type).
    if (searchParams.get("grouped") === "true") {
      const groups = await areaService.getGroupedByType(userId, { supabase });
      return paginated(groups, groups.length, page, pageSize);
    }

    const filters = {
      inactive: parseBool(searchParams.get("inactive")),
      archive: parseBool(searchParams.get("archive")),
    };

    let data = await areaService.list(userId, filters, { supabase });

    // areaService.list has no `type` predicate; post-filter when requested.
    const type = searchParams.get("type");
    if (type) {
      data = data.filter((area) => area.type === type);
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

    const body = await validateBody(request, createAreaSchema);
    const supabase = await createDataClient(authResult);
    const area = await areaService.create(
      userId,
      body as Parameters<typeof areaService.create>[1],
      { supabase },
    );
    return created(area);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
