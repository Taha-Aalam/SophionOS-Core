/**
 * Pure AI/API-key access policy helpers — unit-testable without Next.js request plumbing.
 */

export type ApiKeyAccessMode = "read_only" | "write_limited" | "write_enabled";
export type ApiKeyClientType = "mcp" | "automation" | "personal" | "unknown";

export interface AiAccessSettings {
  ai_access_enabled: boolean;
  ai_write_access_enabled: boolean;
  privacy_notice_version: string | null;
  privacy_notice_accepted_at: string | null;
}

export const DEFAULT_AI_ACCESS_SETTINGS: AiAccessSettings = {
  ai_access_enabled: true,
  // Writes via API keys require an explicit user enable (and a non-read_only key).
  ai_write_access_enabled: false,
  privacy_notice_version: null,
  privacy_notice_accepted_at: null,
};

export const AI_ACCESS_SETTINGS_KEY = "ai_access";

/** HTTP methods that mutate state (API-key write surface). */
export function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/**
 * Whether a key's access_mode permits the HTTP method.
 * - read_only: GET (and HEAD) only
 * - write_limited: GET + POST + PATCH (reversible creates/updates; no DELETE)
 * - write_enabled: all methods
 */
export function isMethodAllowedForAccessMode(
  accessMode: ApiKeyAccessMode | string | null | undefined,
  method: string,
): boolean {
  const mode = (accessMode ?? "read_only") as ApiKeyAccessMode;
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;

  if (mode === "read_only") return false;
  if (mode === "write_limited") {
    return m === "POST" || m === "PATCH" || m === "PUT";
  }
  if (mode === "write_enabled") return true;
  return false;
}

/** Env emergency kill switch for all API-key / MCP writes (incident response). */
export function isGlobalApiKeyWriteDisabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = env.SOPHION_DISABLE_API_KEY_WRITES ?? env.DISABLE_API_KEY_WRITES;
  return v === "1" || v === "true" || v === "yes";
}

export type ApiKeyPolicyDenialCode =
  | "AI_ACCESS_DISABLED"
  | "AI_WRITE_DISABLED"
  | "KEY_ACCESS_MODE_DENIED"
  | "API_KEY_WRITES_DISABLED"
  | "MCP_WRITE_TEMPORARILY_DISABLED";

export interface ApiKeyPolicyDenial {
  code: ApiKeyPolicyDenialCode;
  message: string;
  /** HTTP status override (e.g. 503 for operator kill switch). */
  statusCode?: number;
}

/**
 * Evaluate whether an API-key authenticated request may proceed.
 * Clerk session callers should not use this path for global AI disable.
 */
export function evaluateApiKeyRequestPolicy(input: {
  settings: AiAccessSettings;
  accessMode: ApiKeyAccessMode | string | null | undefined;
  method: string;
  /** When true, operator has disabled all API-key writes globally. */
  globalWriteKillSwitch?: boolean;
}): ApiKeyPolicyDenial | null {
  if (!input.settings.ai_access_enabled) {
    return {
      code: "AI_ACCESS_DISABLED",
      message:
        "AI/API access is disabled for this account. Re-enable it in Settings → AI Access.",
    };
  }

  if (!isWriteMethod(input.method)) {
    return null;
  }

  if (input.globalWriteKillSwitch ?? isGlobalApiKeyWriteDisabled()) {
    return {
      code: "MCP_WRITE_TEMPORARILY_DISABLED",
      message:
        "API key / MCP writes are temporarily disabled by the operator. Dashboard access is unaffected.",
      statusCode: 503,
    };
  }

  if (!input.settings.ai_write_access_enabled) {
    return {
      code: "AI_WRITE_DISABLED",
      message:
        "API key write access is disabled. Enable write access in Settings → AI Access, or use a read-only key for queries.",
    };
  }

  if (!isMethodAllowedForAccessMode(input.accessMode, input.method)) {
    return {
      code: "KEY_ACCESS_MODE_DENIED",
      message: `This API key's access mode (${input.accessMode ?? "read_only"}) does not allow ${input.method.toUpperCase()} requests.`,
    };
  }

  return null;
}

/** Default access mode for newly created keys (MCP-safe). */
export function defaultAccessModeForClientType(
  clientType: ApiKeyClientType | string | undefined,
): ApiKeyAccessMode {
  if (clientType === "mcp" || clientType === undefined || clientType === "unknown") {
    return "read_only";
  }
  // automation/personal still default read-only unless caller opts into write modes.
  return "read_only";
}

/** Non-sensitive prefix for UI (e.g. sop_xxxx…last4). */
export function deriveKeyPrefix(rawKey: string): string {
  if (rawKey.length <= 12) return rawKey.slice(0, 8);
  return `${rawKey.slice(0, 8)}…${rawKey.slice(-4)}`;
}
