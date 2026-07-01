import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// --- Mocks -----------------------------------------------------------------
vi.mock("@/lib/services/topic.service", () => ({
  topicService: {
    list: vi.fn(),
    listArchived: vi.fn(),
    getFavorite: vi.fn(),
    getInactive: vi.fn(),
    getGroupedByArea: vi.fn(),
    create: vi.fn(),
    getByIdentifier: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => {
  const authFn = vi.fn();
  return { requireAuth: authFn, authorizeApiRequest: authFn };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { topicService } from "@/lib/services/topic.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET, POST } from "../topics/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockList = vi.mocked(topicService.list);
const mockCreate = vi.mocked(topicService.create);

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("GET /api/v1/topics", () => {
  it("returns a paginated list (200)", async () => {
    mockList.mockResolvedValue([
      { id: "t1", name: "Fitness", notesCount: 0, resourcesCount: 0, linkedAreaIds: [] },
    ] as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/topics"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.pagination).toMatchObject({ total: 1, page: 1, pageSize: 50 });
  });

  it("returns 401 when requireAuth throws AuthError (unauthorized / no token)", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://localhost/api/v1/topics"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/topics", () => {
  it("creates a topic (201)", async () => {
    mockCreate.mockResolvedValue({
      id: "t2",
      name: "Reading",
      notesCount: 0,
      resourcesCount: 0,
      linkedAreaIds: [],
    } as never);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/topics", "POST", { name: "Reading" }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toMatchObject({ id: "t2", name: "Reading" });
  });

  it("returns 415 when content-type is not application/json", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/topics", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "name=Reading",
      }),
    );
    expect(res.status).toBe(415);

    const json = await res.json();
    expect(json.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });
});
