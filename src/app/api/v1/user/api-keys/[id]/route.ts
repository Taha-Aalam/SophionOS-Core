import { NextRequest } from "next/server";
import { revokeApiKey } from "@/lib/api/api-key-service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    // revokeApiKey is scoped by userId and throws NotFoundError otherwise.
    await revokeApiKey(userId, id);
    return success({ id, revoked: true });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
