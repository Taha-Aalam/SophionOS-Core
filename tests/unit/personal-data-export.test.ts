import { describe, it, expect, vi } from "vitest";
import {
  buildPersonalDataExport,
  exportPersonalDataForUser,
  PERSONAL_EXPORT_SCHEMA_VERSION,
} from "@/lib/export/personal-data-export";

describe("buildPersonalDataExport", () => {
  it("shapes a portable document for the given user only", () => {
    const exportedAt = "2026-07-16T12:00:00.000Z";
    const doc = buildPersonalDataExport(
      "user_alice",
      {
        areas: [{ id: "a1", user_id: "user_alice", name: "Work" }],
        goals: [],
        projects: [{ id: "p1", name: "Ship", user_id: "user_alice" }],
        tasks: [],
        notes: [{ id: "n1", body: "hello", key_hash: "SHOULD_STRIP", secret: "x" }],
        resources: [],
        topics: [],
        contacts: [],
      },
      exportedAt,
    );

    expect(doc.schema_version).toBe(PERSONAL_EXPORT_SCHEMA_VERSION);
    expect(doc.user_id).toBe("user_alice");
    expect(doc.exported_at).toBe(exportedAt);
    expect(doc.meta.counts.areas).toBe(1);
    expect(doc.meta.counts.projects).toBe(1);
    expect(doc.meta.counts.notes).toBe(1);
    expect(doc.entities.notes[0]).toMatchObject({ id: "n1", body: "hello" });
    expect(doc.entities.notes[0] as Record<string, unknown>).not.toHaveProperty("key_hash");
    expect(doc.entities.notes[0] as Record<string, unknown>).not.toHaveProperty("secret");
  });

  it("rejects empty user id", () => {
    expect(() =>
      buildPersonalDataExport("", {
        areas: [],
        goals: [],
        projects: [],
        tasks: [],
        notes: [],
        resources: [],
        topics: [],
        contacts: [],
      }),
    ).toThrow(/userId/i);
  });
});

describe("exportPersonalDataForUser", () => {
  it("queries each core table scoped by user_id and builds the export", async () => {
    const calls: Array<{ table: string; userId: string }> = [];

    const supabase = {
      from(table: string) {
        return {
          select() {
            return {
              eq(column: string, userId: string) {
                expect(column).toBe("user_id");
                calls.push({ table, userId });
                const row =
                  table === "areas"
                    ? [{ id: "a1", user_id: userId, name: "Life" }]
                    : [];
                return Promise.resolve({ data: row, error: null });
              },
            };
          },
        };
      },
    };

    const doc = await exportPersonalDataForUser(
      "user_bob",
      supabase as never,
    );

    expect(doc.user_id).toBe("user_bob");
    expect(doc.entities.areas).toEqual([
      { id: "a1", user_id: "user_bob", name: "Life" },
    ]);
    expect(calls.map((c) => c.table).sort()).toEqual(
      [
        "areas",
        "contacts",
        "goals",
        "notes",
        "projects",
        "resources",
        "tasks",
        "topics",
      ].sort(),
    );
    expect(calls.every((c) => c.userId === "user_bob")).toBe(true);
  });

  it("surfaces database errors from the real fetch path", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "boom" },
                }),
            };
          },
        };
      },
    };

    await expect(
      exportPersonalDataForUser("user_x", supabase as never),
    ).rejects.toThrow(/export failed/i);
  });
});

describe("GET /api/v1/user/export route", () => {
  it("returns export payload for authenticated user via real route handler", async () => {
    vi.resetModules();

    vi.doMock("@/lib/api/api-auth", () => ({
      requireAuth: vi.fn(async () => ({ userId: "user_route", type: "clerk" })),
    }));
    vi.doMock("@/lib/api/rate-limiter", () => ({
      rateLimit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9 })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createDataClient: vi.fn(async () => {
        return {
          from(table: string) {
            return {
              select() {
                return {
                  eq: () =>
                    Promise.resolve({
                      data:
                        table === "tasks"
                          ? [{ id: "t1", user_id: "user_route", name: "Do thing" }]
                          : [],
                      error: null,
                    }),
                };
              },
            };
          },
        };
      }),
    }));

    const { GET } = await import("@/app/api/v1/user/export/route");
    const { NextRequest } = await import("next/server");
    const res = await GET(new NextRequest("http://localhost/api/v1/user/export"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user_id).toBe("user_route");
    expect(body.data.entities.tasks[0]).toMatchObject({ id: "t1" });
    expect(body.data.schema_version).toBe(PERSONAL_EXPORT_SCHEMA_VERSION);
  });
});
