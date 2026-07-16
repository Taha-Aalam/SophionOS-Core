/**
 * Stable API scope constants and access-mode presets for AI/API keys.
 */

export const API_SCOPES = [
  "dashboard:read",
  "areas:read",
  "areas:write",
  "goals:read",
  "goals:write",
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "notes:read",
  "notes:write",
  "resources:read",
  "resources:write",
  "topics:read",
  "topics:write",
  "contacts:read",
  "contacts:write",
  "knowledge:search",
  "inbox:read",
  "my-day:read",
  "archive:write",
  "bulk:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const READ_ONLY_SCOPES: readonly ApiScope[] = [
  "dashboard:read",
  "areas:read",
  "goals:read",
  "projects:read",
  "tasks:read",
  "notes:read",
  "resources:read",
  "topics:read",
  "contacts:read",
  "knowledge:search",
  "inbox:read",
  "my-day:read",
] as const;

export const WRITE_LIMITED_SCOPES: readonly ApiScope[] = [
  ...READ_ONLY_SCOPES,
  "tasks:write",
  "notes:write",
  "resources:write",
] as const;

export const WRITE_ENABLED_SCOPES: readonly ApiScope[] = [
  ...WRITE_LIMITED_SCOPES,
  "areas:write",
  "goals:write",
  "projects:write",
  "topics:write",
  "contacts:write",
  "archive:write",
] as const;

/** bulk:write is never granted by default presets. */

export function scopesForAccessMode(
  mode: string | null | undefined,
): readonly ApiScope[] {
  switch (mode) {
    case "write_enabled":
      return WRITE_ENABLED_SCOPES;
    case "write_limited":
      return WRITE_LIMITED_SCOPES;
    case "read_only":
    default:
      return READ_ONLY_SCOPES;
  }
}

export function scopeSetAllows(
  granted: readonly string[] | null | undefined,
  required: string | null | undefined,
): boolean {
  if (!required) return true;
  // Empty scopes array means “use access-mode preset” (handled by caller).
  if (!granted || granted.length === 0) return true;
  return granted.includes(required);
}
