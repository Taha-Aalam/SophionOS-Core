/**
 * Dual-user isolation proof for the public-alpha launch gate.
 *
 * These tests drive real shipped entry points (areaService, assertOwnedIds,
 * exportPersonalDataForUser, revokeApiKey) with a dual-user fixture store.
 * Live Clerk JWT + Supabase PostgREST RLS is env-gated separately (see
 * docs/testing.md).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertOwnedIds } from "@/lib/api/ownership";
import { exportPersonalDataForUser } from "@/lib/export/personal-data-export";
import { areaService } from "@/lib/services/area.service";
import { revokeApiKey } from "@/lib/api/api-key-service";
import { ForbiddenError, NotFoundError } from "@/lib/api/error-handler";
import type { SupabaseClient } from "@supabase/supabase-js";

const USER_A = "user_a_clerk_id";
const USER_B = "user_b_clerk_id";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

type Row = Record<string, unknown> & { id: string; user_id: string };

function makeDualUserClient(tables: Record<string, Row[]>) {
  function chain(table: string) {
    const filters: Array<{ type: "eq" | "in"; col: string; val: unknown }> = [];

    function applyFilters(rows: Row[]): Row[] {
      let out = rows;
      for (const f of filters) {
        if (f.type === "eq") {
          out = out.filter((r) => r[f.col] === f.val);
        } else {
          const vals = f.val as unknown[];
          out = out.filter((r) => vals.includes(r[f.col]));
        }
      }
      return out;
    }

    const rows = () => tables[table] ?? [];

    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = (col: string, val: unknown) => {
      filters.push({ type: "eq", col, val });
      return api;
    };
    api.in = (col: string, vals: unknown[]) => {
      filters.push({ type: "in", col, val: vals });
      return api;
    };
    api.order = () => api;
    api.limit = async () => ({ data: applyFilters(rows()), error: null });

    const resolve = async () => ({ data: applyFilters(rows()), error: null });
    (api as { then?: typeof Promise.prototype.then }).then = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => resolve().then(onFulfilled, onRejected);

    return api;
  }

  return {
    from: (table: string) => chain(table),
  } as unknown as SupabaseClient;
}

describe("dual-user isolation (core set)", () => {
  const areas: Row[] = [
    {
      id: "area_a1",
      user_id: USER_A,
      name: "A Health",
      slug: "a-health",
      type: "personal",
      archive: false,
      inactive: false,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "area_b1",
      user_id: USER_B,
      name: "B Work",
      slug: "b-work",
      type: "work",
      archive: false,
      inactive: false,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const goals: Row[] = [
    { id: "goal_a1", user_id: USER_A, title: "A goal" },
    { id: "goal_b1", user_id: USER_B, title: "B goal" },
  ];

  let client: SupabaseClient;

  beforeEach(() => {
    client = makeDualUserClient({
      areas,
      goals,
      projects: [],
      tasks: [],
      notes: [],
      resources: [],
      topics: [],
      contacts: [],
    });
  });

  it("areaService.list for User A never returns User B areas", async () => {
    const listed = await areaService.list(USER_A, undefined, { supabase: client });
    expect(listed.map((a) => a.id)).toEqual(["area_a1"]);
    expect(listed.map((a) => a.id)).not.toContain("area_b1");
  });

  it("areaService.list for User B never returns User A areas", async () => {
    const listed = await areaService.list(USER_B, undefined, { supabase: client });
    expect(listed.map((a) => a.id)).toEqual(["area_b1"]);
    expect(listed.map((a) => a.id)).not.toContain("area_a1");
  });

  it("assertOwnedIds blocks User A from linking User B goal id", async () => {
    await expect(
      assertOwnedIds(client, "goals", USER_A, ["goal_b1"], "Goal"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("assertOwnedIds allows User A to link only own goal id", async () => {
    await expect(
      assertOwnedIds(client, "goals", USER_A, ["goal_a1"], "Goal"),
    ).resolves.toBeUndefined();
  });

  it("assertOwnedIds batch with foreign id throws ForbiddenError", async () => {
    await expect(
      assertOwnedIds(client, "goals", USER_A, ["goal_a1", "goal_b1"], "Goal"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("exportPersonalDataForUser only includes User A rows when called as A", async () => {
    const payload = await exportPersonalDataForUser(USER_A, client);
    expect(payload.user_id).toBe(USER_A);
    const areaIds = (payload.entities.areas as Row[]).map((r) => r.id);
    expect(areaIds).toEqual(["area_a1"]);
    expect(areaIds).not.toContain("area_b1");
    const goalIds = (payload.entities.goals as Row[]).map((r) => r.id);
    expect(goalIds).toEqual(["goal_a1"]);
    expect(goalIds).not.toContain("goal_b1");
  });

  it("exportPersonalDataForUser only includes User B rows when called as B", async () => {
    const payload = await exportPersonalDataForUser(USER_B, client);
    expect(payload.user_id).toBe(USER_B);
    expect((payload.entities.areas as Row[]).map((r) => r.id)).toEqual(["area_b1"]);
    expect((payload.entities.goals as Row[]).map((r) => r.id)).toEqual(["goal_b1"]);
  });
});

describe("dual-user API key isolation (shipped revoke path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokeApiKey scopes update by both key id and caller user_id", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const is = vi.fn(() => ({ select }));
    const eqUser = vi.fn(() => ({ is }));
    const eqKey = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqKey }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== "api_keys") throw new Error(`unexpected table ${table}`);
      return { update };
    });

    await expect(revokeApiKey(USER_A, "key_belongs_to_b")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    expect(update).toHaveBeenCalled();
    expect(eqKey).toHaveBeenCalledWith("id", "key_belongs_to_b");
    expect(eqUser).toHaveBeenCalledWith("user_id", USER_A);
  });
});
