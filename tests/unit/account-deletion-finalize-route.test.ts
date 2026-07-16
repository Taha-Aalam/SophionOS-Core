import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/api-auth", () => ({
  requireClerkSession: vi.fn(async () => ({
    userId: "user_123",
    type: "clerk",
  })),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

const mockGet = vi.fn();
const mockFinalize = vi.fn();

vi.mock("@/lib/privacy/account-deletion", () => ({
  getAccountDeletionRequest: (userId: string) => mockGet(userId),
  finalizeAccountDeletion: (userId: string) => mockFinalize(userId),
}));

import { POST as finalizeRoute } from "@/app/api/v1/user/account-deletion/finalize/route";
import { requireClerkSession } from "@/lib/api/api-auth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireClerkSession).mockResolvedValue({
    userId: "user_123",
    type: "clerk",
  });
  mockFinalize.mockResolvedValue({ cleared: ["tasks", "notes"], failed: [] });
});

describe("POST /api/v1/user/account-deletion/finalize", () => {
  it("returns GRACE_NOT_ELAPSED without force when still in grace", async () => {
    mockGet.mockResolvedValue({
      id: "d1",
      clerk_user_id: "user_123",
      status: "scheduled",
      scheduled_for: "2099-12-01T00:00:00.000Z",
      requested_at: "2026-07-16T00:00:00.000Z",
    });

    const res = await finalizeRoute(
      new NextRequest("http://localhost/api/v1/user/account-deletion/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("GRACE_NOT_ELAPSED");
    expect(mockFinalize).not.toHaveBeenCalled();
  });

  it("finalizes when grace elapsed", async () => {
    mockGet.mockResolvedValue({
      id: "d1",
      clerk_user_id: "user_123",
      status: "scheduled",
      scheduled_for: "2020-01-01T00:00:00.000Z",
      requested_at: "2020-01-01T00:00:00.000Z",
    });

    const res = await finalizeRoute(
      new NextRequest("http://localhost/api/v1/user/account-deletion/finalize", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cleared).toContain("tasks");
    expect(mockFinalize).toHaveBeenCalledWith("user_123");
  });

  it("allows early finalize with force:true", async () => {
    mockGet.mockResolvedValue({
      id: "d1",
      clerk_user_id: "user_123",
      status: "scheduled",
      scheduled_for: "2099-12-01T00:00:00.000Z",
      requested_at: "2026-07-16T00:00:00.000Z",
    });

    const res = await finalizeRoute(
      new NextRequest("http://localhost/api/v1/user/account-deletion/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.forced).toBe(true);
    expect(mockFinalize).toHaveBeenCalledWith("user_123");
  });
});
