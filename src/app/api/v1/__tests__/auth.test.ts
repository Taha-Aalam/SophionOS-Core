import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Clerk server auth() and the api-key validator that api-auth depends on.
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockValidateApiKey = vi.fn();
vi.mock("@/lib/api/api-key-service", () => ({
  validateApiKey: (key: string) => mockValidateApiKey(key),
}));

import {
  requireAuth,
  authenticateRequest,
  getAuthUser,
  getOptionalAuthUser,
} from "@/lib/api/api-auth";
import { AuthError } from "@/lib/api/error-handler";

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/areas", { headers });
}

describe("api-auth", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockValidateApiKey.mockReset();
  });

  it("requireAuth throws AuthError (401, no token) when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    mockValidateApiKey.mockResolvedValue(null);
    await expect(requireAuth(req())).rejects.toBeInstanceOf(AuthError);
    try {
      await requireAuth(req());
    } catch (e) {
      expect((e as AuthError).statusCode).toBe(401);
    }
  });

  it("requireAuth returns clerk identity when a Clerk session exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_clerk" });
    const result = await requireAuth(req());
    expect(result).toEqual({ userId: "user_clerk", type: "clerk" });
  });

  it("authenticateRequest resolves an API-key bearer to its user (type api_key)", async () => {
    mockValidateApiKey.mockResolvedValue({ userId: "user_key", keyId: "k1" });
    const result = await authenticateRequest(req({ authorization: "Bearer sop_abc" }));
    expect(result).toEqual({ userId: "user_key", type: "api_key" });
    expect(mockValidateApiKey).toHaveBeenCalledWith("sop_abc");
  });

  it("authenticateRequest falls through to Clerk when the bearer is not a valid API key", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ userId: "user_clerk" });
    const result = await authenticateRequest(req({ authorization: "Bearer notakey" }));
    expect(result).toEqual({ userId: "user_clerk", type: "clerk" });
  });

  it("authenticateRequest returns null when neither path authenticates (unauthorized)", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ userId: null });
    expect(await authenticateRequest(req())).toBeNull();
  });

  it("getAuthUser throws AuthError on no token; getOptionalAuthUser returns null", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(getAuthUser(req())).rejects.toBeInstanceOf(AuthError);
    expect(await getOptionalAuthUser(req())).toBeNull();
  });
});
