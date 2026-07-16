import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError, DatabaseError } from "@/lib/api/error-handler";

const createIntegrationSchema = z.object({
  type: z.string().min(1).max(60),
  external_id: z.string().min(1).max(255),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    // No service layer for integrations — query the table directly, always
    // scoped to the authenticated user.
    const supabase = await createDataClient(authResult);
    const { data, error: dbError } = await supabase
      .from("integrations")
      .select("id, user_id, type, external_id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (dbError) throw new DatabaseError(dbError.message);

    return success(data ?? []);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createIntegrationSchema);
    const supabase = await createDataClient(authResult);

    // user_id is taken from the authenticated session, never from the body.
    const { data, error: dbError } = await supabase
      .from("integrations")
      .insert({ user_id: userId, type: body.type, external_id: body.external_id })
      .select("id, user_id, type, external_id, status, created_at")
      .single();

    if (dbError) throw new DatabaseError(dbError.message);

    return created(data);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
