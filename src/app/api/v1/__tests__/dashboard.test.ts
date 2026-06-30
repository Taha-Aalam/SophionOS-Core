import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// --- Mocks -----------------------------------------------------------------
vi.mock("@/lib/services/dashboard.service", () => ({
  dashboardService: {
    getToday: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { dashboardService } from "@/lib/services/dashboard.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET as getToday } from "../dashboard/today/route";
import { GET as getActivity } from "../dashboard/activity/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetToday = vi.mocked(dashboardService.getToday);

const TODAY_DATA = {
  greeting: "morning",
  tasksTodayCount: 1,
  todayTasks: [],
  activeGoals: [],
  stats: { completedThisWeek: 0, activeGoalsCount: 0, overdueCount: 0 },
  recentActivity: [
    {
      id: "t1",
      entityType: "task",
      entityId: "t1",
      title: "Ship API",
      description: null,
      createdAt: "2026-06-30T00:00:00Z",
      updatedAt: "2026-06-30T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("GET /api/v1/dashboard/today", () => {
  it("returns today's dashboard data (200)", async () => {
    mockGetToday.mockResolvedValue(TODAY_DATA as never);

    const res = await getToday(new NextRequest("http://localhost/api/v1/dashboard/today"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toMatchObject({ greeting: "morning", tasksTodayCount: 1 });
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await getToday(new NextRequest("http://localhost/api/v1/dashboard/today"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/v1/dashboard/activity", () => {
  it("returns the recent activity slice (200)", async () => {
    mockGetToday.mockResolvedValue(TODAY_DATA as never);

    const res = await getActivity(new NextRequest("http://localhost/api/v1/dashboard/activity"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0]).toMatchObject({ id: "t1", entityType: "task" });
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await getActivity(new NextRequest("http://localhost/api/v1/dashboard/activity"));
    expect(res.status).toBe(401);
  });
});
