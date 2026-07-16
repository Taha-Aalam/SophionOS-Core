import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

vi.mock("@/lib/services/resource.service", () => ({
  resourceService: {
    list: vi.fn(),
    listByGoal: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    getWithRelations: vi.fn(),
    replaceAreaLinks: vi.fn(),
    replaceProjectLinks: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-auth", () => {
  const authFn = vi.fn();
  return { requireAuth: authFn, authorizeApiRequest: authFn };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})), createDataClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { resourceService } from "@/lib/services/resource.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET, POST } from "@/app/api/v1/resources/route";
import { GET as GET_DETAIL, PATCH, DELETE } from "@/app/api/v1/resources/[id]/route";
import { POST as ARCHIVE } from "@/app/api/v1/resources/[id]/archive/route";
import { POST as RESTORE } from "@/app/api/v1/resources/[id]/restore/route";

const RESOURCE_FIXTURE = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Test Resource",
  status: "inbox",
  type: "website",
  favorite: false,
  area_id: null,
  topic_id: null,
};

function authOk() {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    userId: "user_123",
    type: "clerk",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authOk();
});

describe("GET /api/v1/resources", () => {
  it("returns 200 with a paginated envelope", async () => {
    (resourceService.list as ReturnType<typeof vi.fn>).mockResolvedValue([RESOURCE_FIXTURE]);

    const res = await GET(new NextRequest("http://localhost/api/v1/resources"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ total: 1, page: 1 });
  });

  it("passes favorite filter through to the service", async () => {
    (resourceService.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/v1/resources?favorite=true"));

    expect(resourceService.list).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ favorite: true }),
      expect.anything(),
    );
  });

  it("groups results when group_by is supplied", async () => {
    (resourceService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...RESOURCE_FIXTURE, id: "a", status: "inbox" },
      { ...RESOURCE_FIXTURE, id: "b", status: "active" },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/v1/resources?group_by=status"),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toHaveProperty("key");
    expect(body.data[0]).toHaveProperty("resources");
  });

  it("returns 401 when auth fails (AuthError)", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthError());

    const res = await GET(new NextRequest("http://localhost/api/v1/resources"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/resources", () => {
  it("creates a resource and returns 201", async () => {
    (resourceService.create as ReturnType<typeof vi.fn>).mockResolvedValue(RESOURCE_FIXTURE);

    const res = await POST(
      new NextRequest("http://localhost/api/v1/resources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Test Resource" }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(RESOURCE_FIXTURE.id);
  });

  it("returns 415 for a non-JSON content type", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/resources", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "name=oops",
      }),
    );

    expect(res.status).toBe(415);
    expect(resourceService.create).not.toHaveBeenCalled();
  });
});

describe("resource [id] routes", () => {
  it("GET returns 200 for a single resource", async () => {
    (resourceService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(RESOURCE_FIXTURE);

    const res = await GET_DETAIL(
      new NextRequest("http://localhost/api/v1/resources/x"),
      { params: Promise.resolve({ id: RESOURCE_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
  });

  it("PATCH returns 415 without a JSON content type", async () => {
    const res = await PATCH(
      new NextRequest("http://localhost/api/v1/resources/x", {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "nope",
      }),
      { params: Promise.resolve({ id: RESOURCE_FIXTURE.id }) },
    );
    expect(res.status).toBe(415);
  });

  it("DELETE returns 200", async () => {
    (resourceService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await DELETE(
      new NextRequest("http://localhost/api/v1/resources/x", { method: "DELETE" }),
      { params: Promise.resolve({ id: RESOURCE_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
  });

  it("archive POST calls archive and returns 200", async () => {
    (resourceService.archive as ReturnType<typeof vi.fn>).mockResolvedValue(RESOURCE_FIXTURE);

    const res = await ARCHIVE(
      new NextRequest("http://localhost/api/v1/resources/x/archive", { method: "POST" }),
      { params: Promise.resolve({ id: RESOURCE_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
    expect(resourceService.archive).toHaveBeenCalledWith(
      "user_123",
      RESOURCE_FIXTURE.id,
      expect.anything(),
    );
  });

  it("restore POST calls unarchive and returns 200", async () => {
    (resourceService.unarchive as ReturnType<typeof vi.fn>).mockResolvedValue(RESOURCE_FIXTURE);

    const res = await RESTORE(
      new NextRequest("http://localhost/api/v1/resources/x/restore", { method: "POST" }),
      { params: Promise.resolve({ id: RESOURCE_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
    expect(resourceService.unarchive).toHaveBeenCalled();
  });
});
