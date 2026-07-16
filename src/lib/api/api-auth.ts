import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppError, AuthError } from "./error-handler";
import { validateApiKey, type ValidatedApiKey } from "./api-key-service";
import { requirePaidTier } from "./subscription";
import { getAiAccessSettings } from "./ai-access-service";
import {
  evaluateApiKeyRequestPolicy,
  isGlobalApiKeyWriteDisabled,
  isWriteMethod,
  type ApiKeyAccessMode,
} from "./ai-access-policy";
import { enforceApiKeyRoutePermission } from "./authorize-scope";
import {
  createRequestId,
  recordApiMutationAudit,
} from "@/lib/audit/audit-service";

export type AuthType = "clerk" | "api_key";

export interface AuthResult {
  userId: string;
  type: AuthType;
  /** Present when type === "api_key". */
  keyId?: string;
  accessMode?: ApiKeyAccessMode | string;
  clientType?: string;
  clientName?: string | null;
  requestId?: string;
}

/**
 * Extracts the Clerk user from a request. Throws AuthError if unauthenticated.
 */
export async function getAuthUser(_request: NextRequest): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError("Authentication required");
  }
  return { userId };
}

/**
 * Like getAuthUser but returns null instead of throwing (for public endpoints).
 */
export async function getOptionalAuthUser(
  _request: NextRequest,
): Promise<{ userId: string } | null> {
  const { userId } = await auth();
  return userId ? { userId } : null;
}

function extractBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function fromValidatedKey(apiKeyResult: ValidatedApiKey): AuthResult {
  return {
    userId: apiKeyResult.userId,
    type: "api_key",
    keyId: apiKeyResult.keyId,
    accessMode: apiKeyResult.accessMode,
    clientType: apiKeyResult.clientType,
    clientName: apiKeyResult.clientName,
  };
}

/**
 * Resolves the caller identity. Prefers an `Authorization: Bearer <api_key>`
 * header (validated against the api_keys table via the admin client); if the
 * token is not a valid API key, falls through to Clerk session auth. Returns
 * null if neither path authenticates.
 *
 * Does not enforce AI-access flags (see requireAuth / authorizeApiRequest) so
 * callers can distinguish 401 vs 403 AI_ACCESS_DISABLED.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  const bearer = extractBearer(request);
  if (bearer) {
    const apiKeyResult = await validateApiKey(bearer);
    if (apiKeyResult) {
      return fromValidatedKey(apiKeyResult);
    }
  }

  const { userId } = await auth();
  if (userId) {
    return { userId, type: "clerk" };
  }

  return null;
}

/**
 * Enforce global AI access kill switch for API-key callers (403, not 401).
 * Clerk dashboard sessions are unaffected.
 */
export async function enforceAiAccessEnabled(authResult: AuthResult): Promise<void> {
  if (authResult.type !== "api_key") return;

  const settings = await getAiAccessSettings(authResult.userId);
  if (!settings.ai_access_enabled) {
    throw new AppError(
      "AI/API access is disabled for this account. Re-enable it in Settings → AI Access.",
      403,
      "AI_ACCESS_DISABLED",
    );
  }
}

/**
 * Enforce write flags + per-key access mode for API-key callers on data routes.
 */
export async function enforceApiKeyRequestPolicy(
  authResult: AuthResult,
  method: string,
  request?: NextRequest,
): Promise<void> {
  if (authResult.type !== "api_key") return;

  const settings = await getAiAccessSettings(authResult.userId);
  const denial = evaluateApiKeyRequestPolicy({
    settings,
    accessMode: authResult.accessMode,
    method,
    globalWriteKillSwitch: isGlobalApiKeyWriteDisabled(),
  });
  if (denial) {
    if (request) {
      void recordApiMutationAudit({
        authResult,
        request,
        action: "denied",
        result: "denied",
        errorCode: denial.code,
        requestId: authResult.requestId,
      });
    }
    throw new AppError(
      denial.message,
      denial.statusCode ?? 403,
      denial.code,
    );
  }

  if (request) {
    try {
      enforceApiKeyRoutePermission(authResult, request);
    } catch (err) {
      if (err instanceof AppError) {
        void recordApiMutationAudit({
          authResult,
          request,
          action: "scope_denied",
          result: "denied",
          errorCode: err.code,
          requestId: authResult.requestId,
        });
      }
      throw err;
    }
  }
}

/**
 * Requires a valid caller (API key or Clerk session). Throws AuthError if none.
 * API keys are rejected with 403 AI_ACCESS_DISABLED when the user kill switch is off.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const result = await authenticateRequest(request);
  if (!result) {
    throw new AuthError("Authentication required");
  }
  await enforceAiAccessEnabled(result);
  return result;
}

/**
 * Dashboard-only operations: create/update/revoke API keys, change AI access
 * flags, disable-all. API keys must not self-escalate privileges.
 */
export function assertClerkSession(authResult: AuthResult): void {
  if (authResult.type !== "clerk") {
    throw new AppError(
      "This action requires a signed-in dashboard session. API keys cannot manage credentials or AI access settings.",
      403,
      "SESSION_REQUIRED",
    );
  }
}

/**
 * requireAuth + Clerk session only (blocks API-key callers with 403).
 */
export async function requireClerkSession(request: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(request);
  assertClerkSession(result);
  return result;
}

/**
 * Full API/MCP authorization: authenticate, paid-tier wall, then API-key
 * write/access-mode/scope/permanent-delete policy. Clerk session dashboard
 * access is not blocked by AI write flags — only API-key traffic is.
 */
export async function authorizeApiRequest(request: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(request);
  result.requestId =
    request.headers.get("x-request-id") ?? createRequestId();
  await requirePaidTier(result.userId);
  await enforceApiKeyRequestPolicy(result, request.method, request);

  // Attribute API-key mutating calls (best-effort; never blocks the write path).
  if (result.type === "api_key" && isWriteMethod(request.method)) {
    void recordApiMutationAudit({
      authResult: result,
      request,
      action: "api_key_mutation",
      result: "authorized",
      requestId: result.requestId,
    });
  }

  return result;
}
