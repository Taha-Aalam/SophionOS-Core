import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

vi.mock("@/lib/services/contact.service", () => ({
  contactService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByGroup: vi.fn(),
    getNeedFollowUp: vi.fn(),
    logInteraction: vi.fn(),
    createLog: vi.fn(),
    getProjectLinks: vi.fn(),
    linkToProject: vi.fn(),
    unlinkFromProject: vi.fn(),
    getTaskLinks: vi.fn(),
    linkToTask: vi.fn(),
    unlinkFromTask: vi.fn(),
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

import { contactService } from "@/lib/services/contact.service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET, POST } from "@/app/api/v1/contacts/route";
import { GET as GET_GROUPS } from "@/app/api/v1/contacts/groups/route";
import { GET as GET_DETAIL, PATCH, DELETE } from "@/app/api/v1/contacts/[id]/route";
import { POST as LOG } from "@/app/api/v1/contacts/[id]/log/route";
import { POST as ARCHIVE } from "@/app/api/v1/contacts/[id]/archive/route";

const CONTACT_FIXTURE = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Ada Lovelace",
  group: "Engineering",
  favorite: false,
  archive: false,
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

describe("GET /api/v1/contacts", () => {
  it("returns 200 with a paginated envelope", async () => {
    (contactService.list as ReturnType<typeof vi.fn>).mockResolvedValue([CONTACT_FIXTURE]);

    const res = await GET(new NextRequest("http://localhost/api/v1/contacts"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ total: 1, page: 1 });
  });

  it("passes the group filter through to the service", async () => {
    (contactService.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/v1/contacts?group=Engineering"));

    expect(contactService.list).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ group: "Engineering" }),
      expect.anything(),
    );
  });

  it("routes follow_up=true to getNeedFollowUp", async () => {
    (contactService.getNeedFollowUp as ReturnType<typeof vi.fn>).mockResolvedValue([CONTACT_FIXTURE]);

    const res = await GET(new NextRequest("http://localhost/api/v1/contacts?follow_up=true"));
    expect(res.status).toBe(200);
    expect(contactService.getNeedFollowUp).toHaveBeenCalled();
  });

  it("returns 401 when auth fails (AuthError)", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthError());

    const res = await GET(new NextRequest("http://localhost/api/v1/contacts"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/contacts/groups", () => {
  it("reshapes getByGroup into a paginated list", async () => {
    (contactService.getByGroup as ReturnType<typeof vi.fn>).mockResolvedValue({
      Engineering: [CONTACT_FIXTURE],
    });

    const res = await GET_GROUPS(new NextRequest("http://localhost/api/v1/contacts/groups"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data[0]).toMatchObject({ group: "Engineering" });
  });
});

describe("POST /api/v1/contacts", () => {
  it("creates a contact and returns 201", async () => {
    (contactService.create as ReturnType<typeof vi.fn>).mockResolvedValue(CONTACT_FIXTURE);

    const res = await POST(
      new NextRequest("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada Lovelace" }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(CONTACT_FIXTURE.id);
  });

  it("returns 415 for a non-JSON content type", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "name=oops",
      }),
    );

    expect(res.status).toBe(415);
    expect(contactService.create).not.toHaveBeenCalled();
  });
});

describe("contact [id] routes", () => {
  it("GET returns 200 for a single contact", async () => {
    (contactService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(CONTACT_FIXTURE);

    const res = await GET_DETAIL(
      new NextRequest("http://localhost/api/v1/contacts/x"),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
  });

  it("PATCH returns 415 without a JSON content type", async () => {
    const res = await PATCH(
      new NextRequest("http://localhost/api/v1/contacts/x", {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "nope",
      }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );
    expect(res.status).toBe(415);
  });

  it("DELETE returns 200", async () => {
    (contactService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await DELETE(
      new NextRequest("http://localhost/api/v1/contacts/x", { method: "DELETE" }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
  });

  it("archive POST toggles archive via update and returns 200", async () => {
    (contactService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...CONTACT_FIXTURE,
      archive: true,
    });

    const res = await ARCHIVE(
      new NextRequest("http://localhost/api/v1/contacts/x/archive", { method: "POST" }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );
    expect(res.status).toBe(200);
    expect(contactService.update).toHaveBeenCalledWith(
      "user_123",
      CONTACT_FIXTURE.id,
      { archive: true },
      expect.anything(),
    );
  });
});

describe("POST /api/v1/contacts/[id]/log", () => {
  it("logs an interaction with a message via createLog and returns 201", async () => {
    (contactService.createLog as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "log_1",
      contact_id: CONTACT_FIXTURE.id,
      message: "Called to follow up",
    });

    const res = await LOG(
      new NextRequest("http://localhost/api/v1/contacts/x/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Called to follow up" }),
      }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );

    expect(res.status).toBe(201);
    expect(contactService.createLog).toHaveBeenCalledWith(
      "user_123",
      CONTACT_FIXTURE.id,
      { message: "Called to follow up" },
      expect.anything(),
    );
  });

  it("bumps last_interaction_at via logInteraction when no message is sent", async () => {
    (contactService.logInteraction as ReturnType<typeof vi.fn>).mockResolvedValue(CONTACT_FIXTURE);

    const res = await LOG(
      new NextRequest("http://localhost/api/v1/contacts/x/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );

    expect(res.status).toBe(200);
    expect(contactService.logInteraction).toHaveBeenCalled();
  });

  it("returns 415 for a non-JSON content type", async () => {
    const res = await LOG(
      new NextRequest("http://localhost/api/v1/contacts/x/log", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "message=hi",
      }),
      { params: Promise.resolve({ id: CONTACT_FIXTURE.id }) },
    );

    expect(res.status).toBe(415);
  });
});
