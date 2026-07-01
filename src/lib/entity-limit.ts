/**
 * Client-side detection + messaging for the Free-tier entity cap (Wall 1).
 *
 * The dashboard writes straight to Postgres (browser supabase-js), so a Free
 * user who hits the 100-item cap gets the entity-cap trigger's
 * `RAISE EXCEPTION 'ENTITY_LIMIT_REACHED'`. Depending on the service create
 * path that error arrives either as a typed `EntityLimitError` (paths wired
 * through `mapDatabaseError`) or as a raw error whose message contains the
 * raised token. Either way, mutation `onError` handlers route through
 * `entityLimitToastMessage` so the user sees a friendly upgrade prompt instead
 * of a raw database string.
 */
export const ENTITY_LIMIT_MESSAGE =
  "You've hit the 100-item Free limit — upgrade to Pro for unlimited items.";

/** True when an error is the entity-cap raise, by typed code or raw message. */
export function isEntityLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "ENTITY_LIMIT_REACHED") return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("ENTITY_LIMIT_REACHED");
}

/**
 * Toast text for a mutation error: the friendly upgrade prompt when it's the
 * entity-cap error, otherwise the error's own message (or the given fallback).
 */
export function entityLimitToastMessage(error: unknown, fallback: string): string {
  if (isEntityLimitError(error)) return ENTITY_LIMIT_MESSAGE;
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}
