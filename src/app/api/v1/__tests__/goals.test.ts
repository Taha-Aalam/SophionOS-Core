import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/services/goal.service", () => ({
  goalService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    getLinkedAreaIds: vi.fn(),
    linkToArea: vi.fn(),
    unlinkFromArea: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => {
  const authFn = vi.fn();
  return { requireAuth: authFn, authorizeApiRequest: authFn };
});

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(), createDataClient: vi.fn(),
}));

import { goalService } from "@/lib/services/goal.service";
import { requireAuth } from "@/lib/api/api-auth";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient, createDataClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/api/error-handler";

import { GET, POST } from "../goals/route";
import { GET as DETAIL_GET, PATCH, DELETE } from "../goals/[id]/route";
import { POST as ARCHIVE } from "../goals/[id]/archive/route";
import { POST as RESTORE } from "../goals/[id]/restore/route";
import {
  GET as AREAS_GET,
  POST as AREAS_POST,
  DELETE as AREAS_DELETE,
} from "../goals/[id]/areas/route";

const requireAuthMock = vi.mocked(requireAuth);
const rateLimitMock = vi.mocked(rateLimit);
const createClientMock = vi.mocked(createClient);
const createDataClientMock = vi.mocked(createDataClient);

const GOAL_ID = "11111111-1111-1111-8111-111111111111";
const AREA_ID = "33333333-3333-3333-8333-333333333333";

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: GOAL_ID,
    user_id: "user_1",
    area_id: null,
    name: "Test goal",
    description: null,
    term: "short",
    priority: "medium",
    target_date: null,
    progress: 0,
    is_completed: false,
    is_archived: false,
    is_inactive: false,
    slug: "test-goal",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    linkedAreaIds: [],
    ...overrides,
  };
}

function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue({ userId: "user_1", type: "clerk" });
  rateLimitMock.mockResolvedValue({ success: true, limit: 100, remaining: 99 });
  // The handlers only forward the client to the service (which is mocked), so
  // a bare object stands in for the real supabase client.
  createClientMock.mockResolvedValue({} as never);
  createDataClientMock.mockResolvedValue({} as never);
});

describe("GET /api/v1/goals", () => {
  it("returns 200 with a paginated envelope", async () => {
    vi.mocked(goalService.list).mockResolvedValue([makeGoal()] as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/goals"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toMatchObject({ total: 1, page: 1 });
  });

  it("parses the term filter and forwards it to the service", async () => {
    vi.mocked(goalService.list).mockResolvedValue([
      makeGoal({ term: "long" }),
    ] as never);

    const res = await GET(
      new NextRequest("http://localhost/api/v1/goals?term=long"),
    );
    expect(res.status).toBe(200);
    expect(goalService.list).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ term: "long" }),
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://localhost/api/v1/goals"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/goals", () => {
  it("creates a goal and returns 201", async () => {
    const created = makeGoal({ name: "New goal" });
    vi.mocked(goalService.create).mockResolvedValue(created as never);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/goals", "POST", {
        name: "New goal",
        term: "short",
      }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.name).toBe("New goal");
    expect(goalService.create).toHaveBeenCalled();
  });

  it("returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest("http://localhost/api/v1/goals", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "name=foo",
    });

    const res = await POST(req);
    expect(res.status).toBe(415);

    const json = await res.json();
    expect(json.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await POST(
      jsonRequest("http://localhost/api/v1/goals", "POST", {
        name: "x",
        term: "short",
      }),
    );
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/v1/goals/[id]", () => {
  it("returns 200 with the hydrated goal", async () => {
    vi.mocked(goalService.getById).mockResolvedValue(makeGoal() as never);

    const res = await DETAIL_GET(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}`),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe(GOAL_ID);
    expect(goalService.getById).toHaveBeenCalledWith(
      "user_1",
      GOAL_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("returns 401 when unauthenticated (AuthError → 401)", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await DETAIL_GET(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}`),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/goals/[id]", () => {
  it("updates a goal and returns 200", async () => {
    vi.mocked(goalService.update).mockResolvedValue(
      makeGoal({ name: "Renamed" }) as never,
    );

    const res = await PATCH(
      jsonRequest(`http://localhost/api/v1/goals/${GOAL_ID}`, "PATCH", {
        name: "Renamed",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe("Renamed");
  });

  it("returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}`, {
      method: "PATCH",
      headers: { "content-type": "text/plain" },
      body: "name=foo",
    });

    const res = await PATCH(req, makeParams(GOAL_ID));
    expect(res.status).toBe(415);
  });
});

describe("DELETE /api/v1/goals/[id]", () => {
  it("deletes a goal and returns 200", async () => {
    vi.mocked(goalService.delete).mockResolvedValue(undefined as never);

    const res = await DELETE(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}`, {
        method: "DELETE",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.deleted).toBe(true);
  });
});

describe("POST /api/v1/goals/[id]/archive + /restore", () => {
  it("archives a goal and returns 200", async () => {
    vi.mocked(goalService.archive).mockResolvedValue(
      makeGoal({ is_archived: true }) as never,
    );

    const res = await ARCHIVE(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}/archive`, {
        method: "POST",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.is_archived).toBe(true);
  });

  it("restores a goal and returns 200", async () => {
    vi.mocked(goalService.restore).mockResolvedValue(
      makeGoal({ is_archived: false }) as never,
    );

    const res = await RESTORE(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}/restore`, {
        method: "POST",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);
    expect(goalService.restore).toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated (AuthError → 401)", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await ARCHIVE(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}/archive`, {
        method: "POST",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/v1/goals/[id]/areas", () => {
  it("GET returns linked area ids", async () => {
    vi.mocked(goalService.getById).mockResolvedValue(makeGoal() as never);
    vi.mocked(goalService.getLinkedAreaIds).mockResolvedValue([AREA_ID]);

    const res = await AREAS_GET(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}/areas`),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.area_ids).toEqual([AREA_ID]);
  });

  it("POST links an area and returns 201", async () => {
    vi.mocked(goalService.linkToArea).mockResolvedValue(makeGoal() as never);

    const res = await AREAS_POST(
      jsonRequest(`http://localhost/api/v1/goals/${GOAL_ID}/areas`, "POST", {
        area_id: AREA_ID,
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(201);
    expect(goalService.linkToArea).toHaveBeenCalledWith(
      "user_1",
      GOAL_ID,
      AREA_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("POST returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/goals/${GOAL_ID}/areas`,
      { method: "POST", headers: { "content-type": "text/plain" }, body: "x" },
    );

    const res = await AREAS_POST(req, makeParams(GOAL_ID));
    expect(res.status).toBe(415);
  });

  it("DELETE unlinks an area and returns 200", async () => {
    vi.mocked(goalService.unlinkFromArea).mockResolvedValue(makeGoal() as never);

    const res = await AREAS_DELETE(
      new NextRequest(
        `http://localhost/api/v1/goals/${GOAL_ID}/areas?area_id=${AREA_ID}`,
        { method: "DELETE" },
      ),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(200);
    expect(goalService.unlinkFromArea).toHaveBeenCalledWith(
      "user_1",
      GOAL_ID,
      AREA_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("DELETE returns 400 when area_id is missing", async () => {
    const res = await AREAS_DELETE(
      new NextRequest(`http://localhost/api/v1/goals/${GOAL_ID}/areas`, {
        method: "DELETE",
      }),
      makeParams(GOAL_ID),
    );
    expect(res.status).toBe(400);
  });
});
