import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AuthError } from "./error-handler";
import { validateApiKey } from "./api-key-service";

export type AuthType = "clerk" | "api_key";

export interface AuthResult {
  userId: string;
  type: AuthType;
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

/**
 * Resolves the caller identity. Prefers an `Authorization: Bearer <api_key>`
 * header (validated against the api_keys table via the admin client); if the
 * token is not a valid API key, falls through to Clerk session auth. Returns
 * null if neither path authenticates.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  const bearer = extractBearer(request);
  if (bearer) {
    const apiKeyResult = await validateApiKey(bearer);
    if (apiKeyResult) {
      return { userId: apiKeyResult.userId, type: "api_key" };
    }
  }

  const { userId } = await auth();
  if (userId) {
    return { userId, type: "clerk" };
  }

  return null;
}

/**
 * Requires a valid caller (API key or Clerk session). Throws AuthError if none.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const result = await authenticateRequest(request);
  if (!result) {
    throw new AuthError("Authentication required");
  }
  return result;
}
