import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// ---- Mocks ----------------------------------------------------------------
vi.mock("@/lib/services/note.service", () => ({
  noteService: {
    list: vi.fn(),
    getById: vi.fn(),
    getByIdentifier: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    delete: vi.fn(),
    getByNotebook: vi.fn(),
    listByGoal: vi.fn(),
    listByTopic: vi.fn(),
    listByProject: vi.fn(),
    getRelatedByNotebook: vi.fn(),
    replaceNotebooks: vi.fn(),
    addNotesToNotebook: vi.fn(),
    removeNoteFromNotebook: vi.fn(),
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
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { noteService } from "@/lib/services/note.service";
import { requireAuth } from "@/lib/api/api-auth";

import { GET, POST } from "../notes/route";
import {
  PUT as notebooksPUT,
  POST as notebooksPOST,
  DELETE as notebooksDELETE,
} from "../notes/[id]/notebooks/route";
import { GET as relatedGET } from "../notes/[id]/related/route";

// ---- Helpers --------------------------------------------------------------
type AnyNote = Record<string, unknown>;

function makeNote(overrides: AnyNote = {}): AnyNote {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user_1",
    area_id: null,
    project_id: null,
    topic_id: null,
    name: "Test Note",
    slug: "test-note",
    content: null,
    type: "note",
    status: "inbox",
    favorite: false,
    pin: false,
    is_archived: false,
    metadata: null,
    created_at: "2026-06-30T00:00:00Z",
    updated_at: "2026-06-30T00:00:00Z",
    linkedAreaIds: [],
    linkedGoalIds: [],
    linkedProjectIds: [],
    linkedTaskIds: [],
    notebooks: [],
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

const authed = () =>
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_1", type: "clerk" });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  authed();
});

// ---- GET list -------------------------------------------------------------
describe("GET /api/v1/notes", () => {
  it("returns 200 with a paginated envelope", async () => {
    (noteService.list as ReturnType<typeof vi.fn>).mockResolvedValue([makeNote(), makeNote({ id: "2" })]);

    const res = await GET(new NextRequest("http://app.localhost/api/v1/notes"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50, total: 2 });
  });

  it("passes the favorite filter through to the service", async () => {
    (noteService.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(new NextRequest("http://app.localhost/api/v1/notes?favorite=true"));

    expect(noteService.list).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ favorite: true }),
      expect.anything(),
    );
  });

  it("routes a notebook filter to getByNotebook", async () => {
    (noteService.getByNotebook as ReturnType<typeof vi.fn>).mockResolvedValue([makeNote()]);

    const res = await GET(new NextRequest("http://app.localhost/api/v1/notes?notebook=Work"));
    expect(res.status).toBe(200);
    expect(noteService.getByNotebook).toHaveBeenCalledWith("user_1", "Work", expect.anything());
  });

  it("groups results when group_by is supplied", async () => {
    (noteService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeNote({ id: "a", status: "inbox" }),
      makeNote({ id: "b", status: "active" }),
    ]);

    const res = await GET(new NextRequest("http://app.localhost/api/v1/notes?group_by=status"));
    expect(res.status).toBe(200);

    const body = await res.json();
    const keys = body.data.map((g: { key: string }) => g.key).sort();
    expect(keys).toEqual(["active", "inbox"]);
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthError("Authentication required"));

    const res = await GET(new NextRequest("http://app.localhost/api/v1/notes"));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});

// ---- POST create ----------------------------------------------------------
describe("POST /api/v1/notes", () => {
  it("returns 201 on create", async () => {
    (noteService.create as ReturnType<typeof vi.fn>).mockResolvedValue(makeNote({ name: "Fresh" }));

    const res = await POST(
      jsonRequest("http://app.localhost/api/v1/notes", "POST", { name: "Fresh" }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.name).toBe("Fresh");
    expect(noteService.create).toHaveBeenCalled();
  });

  it("returns 415 when content-type is not JSON", async () => {
    const req = new NextRequest("http://app.localhost/api/v1/notes", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "name=oops",
    });

    const res = await POST(req);
    expect(res.status).toBe(415);
    expect(noteService.create).not.toHaveBeenCalled();
  });
});

// ---- Notebook membership --------------------------------------------------
describe("notebook membership routes", () => {
  it("PUT replaces the notebook set", async () => {
    (noteService.replaceNotebooks as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (noteService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeNote({ notebooks: ["A", "B"] }),
    );

    const res = await notebooksPUT(
      jsonRequest("http://app.localhost/api/v1/notes/1/notebooks", "PUT", { notebooks: ["A", "B"] }),
      params("1"),
    );
    expect(res.status).toBe(200);
    expect(noteService.replaceNotebooks).toHaveBeenCalledWith("1", ["A", "B"], expect.anything());

    const body = await res.json();
    expect(body.data).toEqual(["A", "B"]);
  });

  it("POST adds the note to a notebook", async () => {
    (noteService.addNotesToNotebook as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (noteService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(makeNote({ notebooks: ["A"] }));

    const res = await notebooksPOST(
      jsonRequest("http://app.localhost/api/v1/notes/1/notebooks", "POST", { notebook: "A" }),
      params("1"),
    );
    expect(res.status).toBe(200);
    expect(noteService.addNotesToNotebook).toHaveBeenCalledWith("user_1", "A", ["1"], expect.anything());
  });

  it("DELETE removes the note from a notebook", async () => {
    (noteService.removeNoteFromNotebook as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (noteService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(makeNote({ notebooks: [] }));

    const res = await notebooksDELETE(
      new NextRequest("http://app.localhost/api/v1/notes/1/notebooks?notebook=A", { method: "DELETE" }),
      params("1"),
    );
    expect(res.status).toBe(200);
    expect(noteService.removeNoteFromNotebook).toHaveBeenCalledWith("user_1", "1", "A", expect.anything());
  });
});

// ---- Related notes --------------------------------------------------------
describe("GET /api/v1/notes/[id]/related", () => {
  it("returns groups derived from shared notebooks", async () => {
    (noteService.getRelatedByNotebook as ReturnType<typeof vi.fn>).mockResolvedValue([
      { notebook: "Work", notes: [makeNote({ id: "x" })] },
    ]);

    const res = await relatedGET(
      new NextRequest("http://app.localhost/api/v1/notes/1/related"),
      params("1"),
    );
    expect(res.status).toBe(200);
    expect(noteService.getRelatedByNotebook).toHaveBeenCalledWith("user_1", "1", expect.anything());

    const body = await res.json();
    expect(body.data[0].notebook).toBe("Work");
  });
});
