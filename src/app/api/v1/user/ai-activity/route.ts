import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError, DatabaseError } from "@/lib/api/error-handler";
import { listAuditEventsForUser } from "@/lib/audit/audit-service";

/**
 * GET /api/v1/user/ai-activity
 * Paginated audit activity for the authenticated user only.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    const keyId = url.searchParams.get("keyId");
    const eventType = url.searchParams.get("eventType");
    const since = url.searchParams.get("since");

    try {
      const result = await listAuditEventsForUser(userId, {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
        keyId,
        eventType,
        since,
      });
      // Never leak another user's rows — query is user-scoped.
      return success({
        events: result.events.map((e) => ({
          ...e,
          // ip_hash only (no raw IP); no banned content fields in metadata by design
          metadata: e.metadata ?? {},
        })),
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages:
            result.pageSize > 0
              ? Math.max(1, Math.ceil(result.total / result.pageSize))
              : 1,
        },
      });
    } catch (err) {
      throw new DatabaseError(
        err instanceof Error ? err.message : "Failed to load activity",
      );
    }
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
