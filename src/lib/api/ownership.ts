import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AppError,
  DatabaseError,
  ForbiddenError,
  NotFoundError,
} from "./error-handler";

/**
 * Assert that every id in `ids` exists in `table` and is owned by `userId`.
 * Used before junction inserts so cross-tenant FK linking cannot succeed even
 * when the caller uses a service-role client (API-key path).
 */
export async function assertOwnedIds(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  ids: string[],
  entityLabel = "Entity",
): Promise<void> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .in("id", unique);

  if (error) {
    throw new DatabaseError(error.message);
  }

  const found = new Set((data ?? []).map((row) => row.id as string));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) {
    // 404 for a single missing id (common single-link path); 403 when batch
    // mixes foreign/unknown ids so we do not confirm other-tenant existence.
    if (missing.length === 1 && unique.length === 1) {
      throw new NotFoundError(entityLabel, missing[0]);
    }
    throw new ForbiddenError(
      "One or more linked entities were not found or are not owned by you",
    );
  }
}

/**
 * Map a junction write failure to the same denial shape assertOwnedIds
 * produces, so a foreign-id attempt can never be distinguished from a
 * missing id and never surfaces a driver-specific 500 existence oracle.
 * The FK-violation branch covers the race where the ownership check passed
 * but the linked row vanished before the write landed; every other failure
 * (connection loss, missing table, …) still surfaces as a DatabaseError.
 */
export function mapJunctionWriteError(
  error: { message?: string; code?: string } | null | undefined,
): AppError {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  if (code === "23503" || message.includes("foreign key") || message.includes("violates foreign key constraint")) {
    return new ForbiddenError(
      "One or more linked entities were not found or are not owned by you",
    );
  }
  return new DatabaseError(message || undefined);
}
