import type { NextRequest } from "next/server";
import { AppError } from "./error-handler";
import type { AuthResult } from "./api-auth";
import { isWriteMethod } from "./ai-access-policy";
import { scopesForAccessMode, scopeSetAllows } from "./api-scopes";
import {
  isPermanentDeletePath,
  lookupRoutePermission,
} from "./route-permissions";

/**
 * Enforce scope presets, archive/bulk flags, and permanent-delete block for
 * API-key traffic. Clerk sessions skip scope checks (dashboard authority).
 */
export function enforceApiKeyRoutePermission(
  authResult: AuthResult,
  request: NextRequest,
): void {
  if (authResult.type !== "api_key") return;

  const method = request.method.toUpperCase();
  const path = new URL(request.url).pathname;

  // Permanent delete is dashboard-only for beta.
  if (isPermanentDeletePath(path, method)) {
    throw new AppError(
      "Permanent delete is not available via API keys or MCP. Use the dashboard, or archive instead.",
      403,
      "PERMANENT_DELETE_DISABLED",
    );
  }

  const perm = lookupRoutePermission(path);
  // Unknown routes still pass method-level access_mode checks in ai-access-policy.
  if (!perm) return;

  const grantedFromMode = scopesForAccessMode(authResult.accessMode);
  // Per-key scopes column may refine grants later; empty means mode preset only.
  const granted = grantedFromMode;

  if (isWriteMethod(method)) {
    if (perm.isBulk && !granted.includes("bulk:write")) {
      throw new AppError(
        "This API key cannot perform bulk write operations.",
        403,
        "SCOPE_DENIED",
      );
    }
    if (perm.isArchive && !granted.includes("archive:write")) {
      // write_limited lacks archive:write
      if ((authResult.accessMode ?? "read_only") === "write_limited") {
        throw new AppError(
          "Write-limited keys cannot archive or restore. Upgrade the key to full write or use the dashboard.",
          403,
          "SCOPE_DENIED",
        );
      }
      if (!scopeSetAllows(granted, "archive:write")) {
        throw new AppError(
          "This API key lacks archive:write scope.",
          403,
          "SCOPE_DENIED",
        );
      }
    }
    const required = perm.writeScope;
    if (required && !scopeSetAllows(granted, required)) {
      throw new AppError(
        `This API key lacks required scope: ${required}`,
        403,
        "SCOPE_DENIED",
      );
    }
  } else {
    const required = perm.readScope;
    if (required && !scopeSetAllows(granted, required)) {
      throw new AppError(
        `This API key lacks required scope: ${required}`,
        403,
        "SCOPE_DENIED",
      );
    }
  }
}
