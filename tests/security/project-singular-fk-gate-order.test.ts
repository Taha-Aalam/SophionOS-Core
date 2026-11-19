import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { projectService } from "@/lib/services/project.service";
import { taskService } from "@/lib/services/task.service";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F9
 * (src/lib/services/project.service.ts.create-update-area-id-post-write-gate, low).
 *
 * projectService.create/update committed the caller-supplied singular area_id
 * as part of the primary projects write, and only asserted area ownership
 * afterwards inside replaceAreaLinks — with no transaction, the 404/403
 * denial left the committed cross-tenant projects.area_id reference behind
 * (plus a 4xx-vs-500 area-existence oracle). taskService is the pre-write
 * sibling: assertOwnedIds runs BEFORE the write.
 */

const AREA_A = "00000000-0000-4000-8000-00000000000a";
const AREA_B = "00000000-0000-4000-8000-00000000000b";

type RecordedOp = {
  table: string;
  op: string;
  payload?: Record<string, unknown>;
};

function makeStub(areas: Array<Record<string, unknown>>) {
  const ops: RecordedOp[] = [];
  const db: Record<string, Array<Record<string, unknown>>> = { areas: [...areas], projects: [] };
  const builder = (table: string) => {
    const state = { mode: "select", filters: [] as Array<{ column: string; value: unknown }> };
    const b = {
      select(_cols?: string) {
        ops.push({ table, op: state.mode === "insert" ? "insert-select" : "select" });
        return b;
      },
      insert(row: Record<string, unknown>) {
        state.mode = "insert";
        ops.push({ table, op: "insert", payload: row });
        db[table] = [...(db[table] ?? []), { ...row, id: "proj-1" }];
        return b;
      },
      update(row: Record<string, unknown>) {
        state.mode = "update";
        ops.push({ table, op: "update", payload: row });
        return b;
      },
      eq(column: string, value: unknown) {
        state.filters.push({ column, value });
        return b;
      },
      in(column: string, values: unknown[]) {
        state.filters.push({ column, value: values });
        return b;
      },
      ilike() {
        return b;
      },
      order() {
        return b;
      },
      limit() {
        return b;
      },
      range() {
        return b;
      },
      single() {
        const matched = (db[table] ?? []).filter((row) =>
          state.filters.every((f) =>
            Array.isArray(f.value) ? f.value.includes(row[f.column]) : row[f.column] === f.value,
          ),
        );
        if (state.mode === "insert") {
          return Promise.resolve({ data: { ...(ops.find((o) => o.op === "insert")?.payload ?? {}), id: "proj-1" }, error: null });
        }
        if (matched.length > 0) {
          return Promise.resolve({ data: matched[0], error: null });
        }
        return Promise.resolve({ data: null, error: { code: "PGRST116", message: "Row not found" } });
      },
      maybeSingle() {
        return b.single();
      },
      then(onF: (result: { data: unknown[]; error: null }) => unknown, onR: (e: unknown) => unknown) {
        const matched = (db[table] ?? []).filter((row) =>
          state.filters.every((f) =>
            Array.isArray(f.value) ? f.value.includes(row[f.column]) : row[f.column] === f.value,
          ),
        );
        return Promise.resolve({ data: matched, error: null }).then(onF, onR);
      },
    };
    return b;
  };
  return {
    ops,
    db,
    supabase: {
      from(table: string) {
        return builder(table);
      },
      rpc() {
        return Promise.resolve({ data: null, error: null });
      },
    } as unknown as SupabaseClient,
  };
}

const OWN_AREAS = [{ id: AREA_A, user_id: "user-a", name: "Own area" }];

describe("project singular area_id ownership gate runs BEFORE the write (audit F9)", () => {
  it("create with a foreign area_id rejects and records NO projects insert", async () => {
    const stub = makeStub(OWN_AREAS);

    await expect(
      projectService.create("user-a", { name: "probe-a", area_id: AREA_B }, { supabase: stub.supabase }),
    ).rejects.toThrow();

    const inserts = stub.ops.filter((o) => o.table === "projects" && o.op === "insert");
    expect(inserts).toEqual([]);
    const firstAreasSelect = stub.ops.findIndex((o) => o.table === "areas");
    const anyProjectsWrite = stub.ops.findIndex((o) => o.table === "projects" && (o.op === "insert" || o.op === "update"));
    if (anyProjectsWrite >= 0) {
      expect(firstAreasSelect).toBeLessThan(anyProjectsWrite);
    }
  });

  it("create with a mixed area_ids batch rejects and records NO projects insert", async () => {
    const stub = makeStub(OWN_AREAS);

    await expect(
      projectService.create(
        "user-a",
        { name: "probe-mix", area_ids: [AREA_A, AREA_B] },
        { supabase: stub.supabase },
      ),
    ).rejects.toThrow();

    expect(stub.ops.filter((o) => o.table === "projects" && o.op === "insert")).toEqual([]);
  });

  it("update with a foreign area_id rejects and records NO projects update", async () => {
    const stub = makeStub(OWN_AREAS);

    await expect(
      projectService.update("user-a", "proj-own", { area_id: AREA_B }, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.ops.filter((o) => o.table === "projects" && o.op === "update")).toEqual([]);
  });

  it("sibling taskService.create already gates before the write (invariant stays pinned)", async () => {
    const stub = makeStub(OWN_AREAS);

    await expect(
      taskService.create("user-a", { name: "probe-a", area_id: AREA_B, status: "todo" }, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.ops.filter((o) => o.table === "tasks" && o.op === "insert")).toEqual([]);
    expect(stub.ops.some((o) => o.table === "areas")).toBe(true);
  });

  it("create with an owned area_id still persists (no functional regression)", async () => {
    const stub = makeStub(OWN_AREAS);

    const project = await projectService.create("user-a", { name: "probe-ok", area_id: AREA_A }, {
      supabase: stub.supabase,
    });

    expect(stub.ops.filter((o) => o.table === "projects" && o.op === "insert")).toHaveLength(1);
    const firstAreasSelect = stub.ops.findIndex((o) => o.table === "areas");
    const insertIdx = stub.ops.findIndex((o) => o.table === "projects" && o.op === "insert");
    expect(firstAreasSelect).toBeLessThan(insertIdx);
    expect((project as unknown as Record<string, unknown>).name).toBe("probe-ok");
  });
});
