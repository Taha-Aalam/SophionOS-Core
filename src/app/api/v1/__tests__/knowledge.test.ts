import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// --- Mocks -----------------------------------------------------------------
vi.mock("@/lib/services/knowledge.service", () => ({
  knowledgeService: {
    search: vi.fn(),
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

import { knowledgeService } from "@/lib/services/knowledge.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET } from "../knowledge/search/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockSearch = vi.mocked(knowledgeService.search);

const RESULTS = {
  notes: [{ id: "n1", name: "Roadmap" }],
  resources: [],
  topics: [],
  counts: { notes: 1, resources: 0, topics: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("GET /api/v1/knowledge/search", () => {
  it("returns search results (200)", async () => {
    mockSearch.mockResolvedValue(RESULTS as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/knowledge/search?q=road"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.counts).toMatchObject({ notes: 1 });
    expect(mockSearch).toHaveBeenCalledWith("user_123", "road", expect.anything());
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://localhost/api/v1/knowledge/search?q=road"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
