import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// --- Mocks -----------------------------------------------------------------
vi.mock("@/lib/services/task.service", () => ({
  taskService: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/services/note.service", () => ({
  noteService: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/services/resource.service", () => ({
  resourceService: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  // Chainable stub — the services are mocked, so the passed client is unused.
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { taskService } from "@/lib/services/task.service";
import { noteService } from "@/lib/services/note.service";
import { resourceService } from "@/lib/services/resource.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET } from "../inbox/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockTaskList = vi.mocked(taskService.list);
const mockNoteList = vi.mocked(noteService.list);
const mockResourceList = vi.mocked(resourceService.list);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("GET /api/v1/inbox", () => {
  it("aggregates inbox items across tasks/notes/resources (200)", async () => {
    mockTaskList.mockResolvedValue([
      { id: "t1", status: "inbox" },
      { id: "t2", status: "todo" },
    ] as never);
    mockNoteList.mockResolvedValue([{ id: "n1", status: "inbox" }] as never);
    mockResourceList.mockResolvedValue([{ id: "r1", status: "inbox" }] as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/inbox"));
    expect(res.status).toBe(200);

    const json = await res.json();
    // Only the inbox task survives the status filter.
    expect(json.data.tasks).toHaveLength(1);
    expect(json.data.tasks[0].id).toBe("t1");
    expect(json.data.notes).toHaveLength(1);
    expect(json.data.resources).toHaveLength(1);
    expect(json.data.counts).toMatchObject({ tasks: 1, notes: 1, resources: 1, total: 3 });
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://localhost/api/v1/inbox"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
