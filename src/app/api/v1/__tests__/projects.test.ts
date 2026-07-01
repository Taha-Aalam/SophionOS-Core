import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/services/project.service", () => ({
  projectService: {
    list: vi.fn(),
    listByArea: vi.fn(),
    listByGoal: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    getWithRelations: vi.fn(),
    linkToArea: vi.fn(),
    unlinkFromArea: vi.fn(),
    linkToGoal: vi.fn(),
    unlinkFromGoal: vi.fn(),
  },
}));

vi.mock("@/lib/services/contact.service", () => ({
  contactService: {
    getProjectLinks: vi.fn(),
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
  createClient: vi.fn(),
}));

import { projectService } from "@/lib/services/project.service";
import { contactService } from "@/lib/services/contact.service";
import { requireAuth } from "@/lib/api/api-auth";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/api/error-handler";

import { GET, POST } from "../projects/route";
import { GET as DETAIL_GET, PATCH, DELETE } from "../projects/[id]/route";
import { POST as ARCHIVE } from "../projects/[id]/archive/route";
import { POST as RESTORE } from "../projects/[id]/restore/route";
import {
  GET as AREAS_GET,
  POST as AREAS_POST,
  DELETE as AREAS_DELETE,
} from "../projects/[id]/areas/route";
import {
  GET as GOALS_GET,
  POST as GOALS_POST,
  DELETE as GOALS_DELETE,
} from "../projects/[id]/goals/route";

const requireAuthMock = vi.mocked(requireAuth);
const rateLimitMock = vi.mocked(rateLimit);
const createClientMock = vi.mocked(createClient);

const PROJECT_ID = "11111111-1111-1111-8111-111111111111";
const AREA_ID = "22222222-2222-2222-8222-222222222222";
const GOAL_ID = "33333333-3333-3333-8333-333333333333";
const CONTACT_ID = "44444444-4444-4444-8444-444444444444";

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: PROJECT_ID,
    user_id: "user_1",
    area_id: null,
    name: "Test project",
    description: null,
    status: "inbox",
    priority: "medium",
    start_date: null,
    due_date: null,
    progress: 0,
    is_archived: false,
    slug: "test-project",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    linkedAreaIds: [],
    linkedGoalIds: [],
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
});

describe("GET /api/v1/projects", () => {
  it("returns 200 with a paginated envelope", async () => {
    vi.mocked(projectService.list).mockResolvedValue([makeProject()] as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/projects"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toMatchObject({ total: 1, page: 1 });
  });

  it("maps status=in_progress onto the active project status", async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      makeProject({ status: "active" }),
    ] as never);

    const res = await GET(
      new NextRequest("http://localhost/api/v1/projects?status=in_progress"),
    );
    expect(res.status).toBe(200);
    expect(projectService.list).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ status: "active" }),
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("routes goal_id to listByGoal", async () => {
    vi.mocked(projectService.listByGoal).mockResolvedValue([
      makeProject(),
    ] as never);

    const res = await GET(
      new NextRequest(`http://localhost/api/v1/projects?goal_id=${GOAL_ID}`),
    );
    expect(res.status).toBe(200);
    expect(projectService.listByGoal).toHaveBeenCalledWith(
      "user_1",
      GOAL_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("filters by contact_id using contact project links", async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      makeProject(),
      makeProject({ id: "99999999-9999-9999-9999-999999999999" }),
    ] as never);
    vi.mocked(contactService.getProjectLinks).mockResolvedValue([
      { project_id: PROJECT_ID } as never,
    ]);

    const res = await GET(
      new NextRequest(
        `http://localhost/api/v1/projects?contact_id=${CONTACT_ID}`,
      ),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(PROJECT_ID);
  });

  it("returns a grouped map when group_by=status", async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      makeProject({ status: "inbox" }),
      makeProject({ id: "99999999-9999-9999-9999-999999999999", status: "active" }),
    ] as never);

    const res = await GET(
      new NextRequest("http://localhost/api/v1/projects?group_by=status"),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.groupBy).toBe("status");
    expect(json.data.groups.inbox).toHaveLength(1);
    expect(json.data.groups.active).toHaveLength(1);
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://localhost/api/v1/projects"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/projects", () => {
  it("creates a project and returns 201", async () => {
    const created = makeProject({ name: "New project" });
    vi.mocked(projectService.create).mockResolvedValue(created as never);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/projects", "POST", {
        name: "New project",
      }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.name).toBe("New project");
    expect(projectService.create).toHaveBeenCalled();
  });

  it("returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest("http://localhost/api/v1/projects", {
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
      jsonRequest("http://localhost/api/v1/projects", "POST", { name: "x" }),
    );
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/v1/projects/[id]", () => {
  it("returns 200 with the hydrated project", async () => {
    vi.mocked(projectService.getById).mockResolvedValue(makeProject() as never);

    const res = await DETAIL_GET(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}`),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe(PROJECT_ID);
  });

  it("returns 401 when unauthenticated (AuthError → 401)", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await DETAIL_GET(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}`),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/projects/[id]", () => {
  it("updates a project and returns 200", async () => {
    vi.mocked(projectService.update).mockResolvedValue(
      makeProject({ name: "Renamed" }) as never,
    );

    const res = await PATCH(
      jsonRequest(`http://localhost/api/v1/projects/${PROJECT_ID}`, "PATCH", {
        name: "Renamed",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe("Renamed");
  });

  it("returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/projects/${PROJECT_ID}`,
      { method: "PATCH", headers: { "content-type": "text/plain" }, body: "x" },
    );

    const res = await PATCH(req, makeParams(PROJECT_ID));
    expect(res.status).toBe(415);
  });
});

describe("DELETE /api/v1/projects/[id]", () => {
  it("deletes a project and returns 200", async () => {
    vi.mocked(projectService.delete).mockResolvedValue(undefined as never);

    const res = await DELETE(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}`, {
        method: "DELETE",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.deleted).toBe(true);
  });
});

describe("POST /api/v1/projects/[id]/archive + /restore", () => {
  it("archives a project and returns 200", async () => {
    vi.mocked(projectService.archive).mockResolvedValue(
      makeProject({ is_archived: true }) as never,
    );

    const res = await ARCHIVE(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/archive`, {
        method: "POST",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.is_archived).toBe(true);
  });

  it("restores a project and returns 200", async () => {
    vi.mocked(projectService.restore).mockResolvedValue(
      makeProject({ is_archived: false }) as never,
    );

    const res = await RESTORE(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/restore`, {
        method: "POST",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);
    expect(projectService.restore).toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated (AuthError → 401)", async () => {
    requireAuthMock.mockRejectedValue(new AuthError("Authentication required"));

    const res = await ARCHIVE(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/archive`, {
        method: "POST",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/v1/projects/[id]/areas", () => {
  it("GET returns linked area ids", async () => {
    vi.mocked(projectService.getWithRelations).mockResolvedValue({
      goal_ids: [],
      area_ids: [AREA_ID],
      goals: [],
    });

    const res = await AREAS_GET(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/areas`),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.area_ids).toEqual([AREA_ID]);
  });

  it("POST links an area and returns 201", async () => {
    vi.mocked(projectService.linkToArea).mockResolvedValue(undefined as never);
    vi.mocked(projectService.getById).mockResolvedValue(makeProject() as never);

    const res = await AREAS_POST(
      jsonRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/areas`, "POST", {
        area_id: AREA_ID,
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(201);
    expect(projectService.linkToArea).toHaveBeenCalledWith(
      "user_1",
      PROJECT_ID,
      AREA_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("POST returns 415 when the content-type is not application/json", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/projects/${PROJECT_ID}/areas`,
      { method: "POST", headers: { "content-type": "text/plain" }, body: "x" },
    );

    const res = await AREAS_POST(req, makeParams(PROJECT_ID));
    expect(res.status).toBe(415);
  });

  it("DELETE unlinks an area and returns 200", async () => {
    vi.mocked(projectService.unlinkFromArea).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(projectService.getById).mockResolvedValue(makeProject() as never);

    const res = await AREAS_DELETE(
      new NextRequest(
        `http://localhost/api/v1/projects/${PROJECT_ID}/areas?area_id=${AREA_ID}`,
        { method: "DELETE" },
      ),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);
    expect(projectService.unlinkFromArea).toHaveBeenCalledWith(
      "user_1",
      PROJECT_ID,
      AREA_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });
});

describe("/api/v1/projects/[id]/goals", () => {
  it("GET returns linked goal ids", async () => {
    vi.mocked(projectService.getWithRelations).mockResolvedValue({
      goal_ids: [GOAL_ID],
      area_ids: [],
      goals: [{ id: GOAL_ID, name: "G" }],
    });

    const res = await GOALS_GET(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/goals`),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.goal_ids).toEqual([GOAL_ID]);
  });

  it("POST links a goal and returns 201", async () => {
    vi.mocked(projectService.linkToGoal).mockResolvedValue(undefined as never);
    vi.mocked(projectService.getById).mockResolvedValue(makeProject() as never);

    const res = await GOALS_POST(
      jsonRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/goals`, "POST", {
        goal_id: GOAL_ID,
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(201);
    expect(projectService.linkToGoal).toHaveBeenCalledWith(
      "user_1",
      PROJECT_ID,
      GOAL_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("DELETE unlinks a goal and returns 200", async () => {
    vi.mocked(projectService.unlinkFromGoal).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(projectService.getById).mockResolvedValue(makeProject() as never);

    const res = await GOALS_DELETE(
      new NextRequest(
        `http://localhost/api/v1/projects/${PROJECT_ID}/goals?goal_id=${GOAL_ID}`,
        { method: "DELETE" },
      ),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(200);
    expect(projectService.unlinkFromGoal).toHaveBeenCalledWith(
      "user_1",
      PROJECT_ID,
      GOAL_ID,
      expect.objectContaining({ supabase: expect.anything() }),
    );
  });

  it("DELETE returns 400 when goal_id is missing", async () => {
    const res = await GOALS_DELETE(
      new NextRequest(`http://localhost/api/v1/projects/${PROJECT_ID}/goals`, {
        method: "DELETE",
      }),
      makeParams(PROJECT_ID),
    );
    expect(res.status).toBe(400);
  });
});
