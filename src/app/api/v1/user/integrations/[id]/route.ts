import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError, DatabaseError, NotFoundError } from "@/lib/api/error-handler";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);

    // Scope the delete by both id AND user_id so a caller can never unlink
    // another user's integration. Returning the row confirms ownership.
    const { data, error: dbError } = await supabase
      .from("integrations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (dbError) throw new DatabaseError(dbError.message);
    if (!data) throw new NotFoundError("Integration", id);

    return success({ id, unlinked: true });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
