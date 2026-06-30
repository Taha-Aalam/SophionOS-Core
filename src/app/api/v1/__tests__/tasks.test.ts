import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/services/task.service", () => ({
  taskService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    permanentDelete: vi.fn(),
    getByStatus: vi.fn(),
    getOverdue: vi.fn(),
    getFocused: vi.fn(),
    getAreaLinks: vi.fn(),
    getGoalLinks: vi.fn(),
    getProjectLinks: vi.fn(),
    replaceAreaLinks: vi.fn(),
    replaceGoalLinks: vi.fn(),
    replaceProjectLinks: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { taskService } from "@/lib/services/task.service";
import { requireAuth } from "@/lib/api/api-auth";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/api/error-handler";

import { GET, POST } from "../tasks/route";
import { POST as BULK_COMPLETE } from "../tasks/bulk/complete/route";

const requireAuthMock = vi.mocked(requireAuth);
const rateLimitMock = vi.mocked(rateLimit);
const createClientMock = vi.mocked(createClient);

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user_1",
    area_id: null,
    project_id: null,
    name: "Test task",
    description: null,
    status: "inbox",
    priority: "medium",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    completed_at: null,
    previous_status: null,
    smart_priority: 3,
    is_archived: false,
    is_recurring: false,
    repeat_every: null,
    repeat_cycle: null,
    recurrence_source_task_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    linkedAreaIds: [],
    linkedGoalIds: [],
    linkedProjectIds: [],
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

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue({ userId: "user_1", type: "clerk" });
  rateLimitMock.mockResolvedValue({ success: true, limit: 100, remaining: 99 });
  // The handlers only forward the client to the service (which is mocked), so
  // a bare object stands in for the real supabase client.
  createClientMock.mockResolvedValue({} as never);
});

describe("GET /api/v1/tasks", () => {
  it("returns 200 with a paginated envelope", async () => {
    vi.mocked(taskService.list).mockResolvedValue([makeTask()] as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/tasks"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toMatchObject({ total: 1, page: 1 });
  });

  it("passes the status filter to getByStatus and applies priority in-memory", async () => {
    vi.mocked(taskService.getByStatus).mockResolvedValue([
      makeTask({ status: "todo", priority: "high" }),
      makeTask({ id: "22222222-2222-2222-2222-222222222222", status: "todo", priority: "low" }),
    ] as never);

    const res = await GET(
      new NextRequest("http://localhost/api/v1/tasks?status=todo&priority=high"),
    );
    expect(res.status).toBe(200);
    expect(taskService.getByStatus).toHaveBeenCalledWith(
      "user_1",
      "todo",
      expect.objectContaining({ supabase: expect.anything() }),
    );

    const json = await res.json();
    // priority=high removes the low-priority row.
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe("high");
  });
});

describe("POST /api/v1/tasks", () => {
  it("creates a task and returns 201", async () => {
    const created = makeTask({ name: "New task" });
    vi.mocked(taskService.create).mockResolvedValue(created as never);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/tasks", "POST", { name: "New task" }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.name).toBe("New task");
    expect(taskService.create).toHaveBeenCalled();
  });

  it("returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest("http://localhost/api/v1/tasks", {
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
      jsonRequest("http://localhost/api/v1/tasks", "POST", { name: "x" }),
    );
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/tasks/bulk/complete", () => {
  it("completes each id and returns a 200 summary", async () => {
    vi.mocked(taskService.complete).mockResolvedValue({ completedTask: makeTask() } as never);

    const ids = [
      "11111111-1111-1111-8111-111111111111",
      "22222222-2222-2222-8222-222222222222",
    ];
    const res = await BULK_COMPLETE(
      jsonRequest("http://localhost/api/v1/tasks/bulk/complete", "POST", { ids }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.succeeded).toEqual(ids);
    expect(json.data.failed).toEqual([]);
    expect(json.data.total).toBe(2);
    expect(taskService.complete).toHaveBeenCalledTimes(2);
  });

  it("returns 401 when unauthenticated (AuthError → 401)", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await BULK_COMPLETE(
      jsonRequest("http://localhost/api/v1/tasks/bulk/complete", "POST", {
        ids: ["11111111-1111-1111-1111-111111111111"],
      }),
    );
    expect(res.status).toBe(401);
  });
});
