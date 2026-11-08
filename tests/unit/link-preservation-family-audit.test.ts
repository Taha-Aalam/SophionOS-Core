import { beforeEach, describe, expect, it, vi } from "vitest";

import { resourceService } from "../../src/lib/services/resource.service";
import { noteService } from "../../src/lib/services/note.service";
import { taskService } from "../../src/lib/services/task.service";
import { contactService } from "../../src/lib/services/contact.service";
import { goalService } from "../../src/lib/services/goal.service";
import { projectService } from "../../src/lib/services/project.service";
import { topicService } from "../../src/lib/services/topic.service";

/**
 * Family audit for the #153 ruling, generalised: a link field ABSENT from a
 * partial update must leave stored links untouched; only an explicit clear
 * (the field present and emptied) may remove links.
 *
 * The route-level validator layer is pinned in
 * tests/unit/update-schema-link-absence.test.ts (absent stays absent after
 * Zod). This file pins the SERVICE layer: for every entity that owns
 * junction links, an omit-the-field partial update issues NO junction
 * writes, while an explicit `[]` still clears (the control that keeps
 * deliberate unlinks working).
 *
 * The stored-state, end-to-end proof for the killing request shapes lives
 * in the PR's Step 0 observation record (real scratch Supabase, junction
 * rows read after every operation).
 */

const USER = "user-1";
const ID = "11111111-1111-4111-8111-111111111111";

type FakeCall = { table: string; op: string; args: unknown[] };

/**
 * Universal chainable fake supabase client.
 * - `.from(t).update(...).eq(...).select(...).single()` resolves the row
 *   registered for t (or a generic row).
 * - Any awaited chain resolves `{ data: [...], error: null }`.
 * - `.in(column, values)` resolves one `{ id }` row per requested value so
 *   ownership asserts see the requested ids as owned.
 * Every `from(table)` entry point is recorded for junction-write assertions.
 */
function makeFakeSb(rowByTable: Record<string, Record<string, unknown>> = {}) {
  const calls: FakeCall[] = [];

  function makeBuilder(table: string): Record<string, unknown> & PromiseLike<unknown> {
    const builder: Record<string, unknown> = {};
    const entry = (op: string) => {
      calls.push({ table, op, args: [] });
      return builder;
    };
    for (const method of [
      "select", "eq", "neq", "order", "limit", "range", "update", "insert",
      "upsert", "delete", "or", "contains", "overlaps",
    ]) {
      builder[method] = () => entry(method);
    }
    builder.in = (column: string, values: string[]) => {
      calls.push({ table, op: "in", args: [column, values] });
      return Promise.resolve({
        data: (values ?? []).map((id) => ({ id })),
        error: null,
      });
    };
    builder.single = () => {
      calls.push({ table, op: "single", args: [] });
      return Promise.resolve({
        data: rowByTable[table] ?? { id: ID, user_id: USER, name: "Row" },
        error: null,
      });
    };
    builder.maybeSingle = () => {
      calls.push({ table, op: "maybeSingle", args: [] });
      return Promise.resolve({
        data: rowByTable[table] ?? { id: ID, user_id: USER, name: "Row" },
        error: null,
      });
    };
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return builder;
  }

  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push({ table, op: "from", args: [] });
        return makeBuilder(table);
      },
      rpc: () => makeBuilder("rpc"),
    },
  };
}

function callsTo(calls: FakeCall[], table: string): FakeCall[] {
  return calls.filter((c) => c.table === table);
}

/** Junction WRITE operations (hydration reads are `.select` and harmless). */
function junctionWrites(calls: FakeCall[], table: string): FakeCall[] {
  return callsTo(calls, table).filter((c) =>
    ["update", "insert", "upsert", "delete"].includes(c.op),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("family audit: omit-the-field partial updates never touch junctions", () => {
  describe("resourceService.update", () => {
    it("dialog edit shape {name,url,type,status,topic_id} issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ resources: { id: ID, user_id: USER, name: "R" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceTaskLinks", "replaceProjectLinks"]
        .map((m) => vi.spyOn(resourceService, m as keyof typeof resourceService).mockResolvedValue(undefined as never));

      // Exact body of resource-dialog.tsx handleSubmit with empty pickers
      // (JSON.stringify drops the undefined link fields).
      await resourceService.update(USER, ID, {
        name: "Renamed",
        url: null,
        type: "website",
        status: "to_review",
        topic_id: null,
      } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "resource_areas")).toHaveLength(0);
      expect(junctionWrites(calls, "resource_projects")).toHaveLength(0);
      expect(junctionWrites(calls, "goal_resources")).toHaveLength(0);
      expect(junctionWrites(calls, "task_resources")).toHaveLength(0);
    });

    it.each([
      ["status toggle {status}", { status: "completed" }],
      ["favorite toggle {favorite}", { favorite: true }],
    ])("%s issues no junction writes", async (_label, body) => {
      const { client, calls } = makeFakeSb({ resources: { id: ID, user_id: USER, name: "R" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceTaskLinks", "replaceProjectLinks"]
        .map((m) => vi.spyOn(resourceService, m as keyof typeof resourceService).mockResolvedValue(undefined as never));

      await resourceService.update(USER, ID, body as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "resource_projects")).toHaveLength(0);
    });

    it("explicit project_ids: [] clears (replaceProjectLinks called with [])", async () => {
      const { client } = makeFakeSb({ resources: { id: ID, user_id: USER, name: "R" } });
      const spy = vi.spyOn(resourceService, "replaceProjectLinks").mockResolvedValue(undefined as never);

      await resourceService.update(USER, ID, { project_ids: [] } as never, { supabase: client as never });

      expect(spy).toHaveBeenCalledWith(USER, ID, [], expect.anything());
    });

    it("explicit project_ids: [p2] replaces the set", async () => {
      const { client } = makeFakeSb({ resources: { id: ID, user_id: USER, name: "R" } });
      const spy = vi.spyOn(resourceService, "replaceProjectLinks").mockResolvedValue(undefined as never);

      await resourceService.update(USER, ID, { project_ids: ["22222222-2222-4222-8222-222222222222"] } as never, { supabase: client as never });

      expect(spy).toHaveBeenCalledWith(USER, ID, ["22222222-2222-4222-8222-222222222222"], expect.anything());
    });

    it("the fixed process-form body (project pick present) keeps the link", async () => {
      // Exact body of resource-inbox-process-form.tsx handleSave after the
      // preselected guard, for a resource linked to project-1 whose user
      // files it into area-1: every field present, the untouched project
      // link carried through — the request shape that replaces the
      // pre-fix killing payload (project_ids: []).
      const { client } = makeFakeSb({ resources: { id: ID, user_id: USER, name: "R" } });
      const projectSpy = vi.spyOn(resourceService, "replaceProjectLinks").mockResolvedValue(undefined as never);
      const areaSpy = vi.spyOn(resourceService, "replaceAreaLinks").mockResolvedValue(undefined as never);

      await resourceService.update(USER, ID, {
        area_id: "33333333-3333-4333-8333-333333333333",
        area_ids: ["33333333-3333-4333-8333-333333333333"],
        goal_ids: [],
        project_ids: ["22222222-2222-4222-8222-222222222222"],
        task_ids: [],
        topic_id: null,
        status: "active",
      } as never, { supabase: client as never });

      expect(projectSpy).toHaveBeenCalledWith(
        USER, ID, ["22222222-2222-4222-8222-222222222222"], expect.anything(),
      );
      expect(areaSpy).toHaveBeenCalledWith(
        USER, ID, ["33333333-3333-4333-8333-333333333333"], expect.anything(),
      );
    });
  });

  describe("noteService.update", () => {
    it("editor save {name, content} issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ notes: { id: ID, user_id: USER, name: "N" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceProjectLinks", "replaceTaskLinks"]
        .map((m) => vi.spyOn(noteService, m as keyof typeof noteService).mockResolvedValue(undefined as never));

      await noteService.update(USER, ID, { name: "Renamed", content: "Body" } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "note_areas")).toHaveLength(0);
      expect(junctionWrites(calls, "note_projects")).toHaveLength(0);
    });

    it("pin toggle {pin} and bulk status {status} issue no junction writes", async () => {
      for (const body of [{ pin: true }, { status: "completed" }]) {
        const { client, calls } = makeFakeSb({ notes: { id: ID, user_id: USER, name: "N" } });
        const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceProjectLinks", "replaceTaskLinks"]
          .map((m) => vi.spyOn(noteService, m as keyof typeof noteService).mockResolvedValue(undefined as never));

        await noteService.update(USER, ID, body as never, { supabase: client as never });

        for (const spy of spies) expect(spy).not.toHaveBeenCalled();
        expect(junctionWrites(calls, "note_projects")).toHaveLength(0);
      }
    });

    it("explicit project_ids: [] clears; explicit [p2] replaces", async () => {
      const spy = vi.spyOn(noteService, "replaceProjectLinks").mockResolvedValue(undefined as never);

      const { client } = makeFakeSb({ notes: { id: ID, user_id: USER, name: "N" } });
      await noteService.update(USER, ID, { project_ids: [] } as never, { supabase: client as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, [], expect.anything());

      const { client: client2 } = makeFakeSb({ notes: { id: ID, user_id: USER, name: "N" } });
      await noteService.update(USER, ID, { project_ids: ["22222222-2222-4222-8222-222222222222"] } as never, { supabase: client2 as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, ["22222222-2222-4222-8222-222222222222"], expect.anything());
    });
  });

  describe("taskService.update", () => {
    it("rename-only update issues no junction writes and keeps scalar columns", async () => {
      const { client, calls } = makeFakeSb({ tasks: { id: ID, user_id: USER, name: "T" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceProjectLinks"]
        .map((m) => vi.spyOn(taskService, m as keyof typeof taskService).mockResolvedValue(undefined as never));

      await taskService.update(USER, ID, { name: "Renamed" } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "task_areas")).toHaveLength(0);
      expect(junctionWrites(calls, "task_projects")).toHaveLength(0);
      expect(junctionWrites(calls, "goal_tasks")).toHaveLength(0);
    });

    it("status toggle {status} issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ tasks: { id: ID, user_id: USER, name: "T" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks", "replaceProjectLinks"]
        .map((m) => vi.spyOn(taskService, m as keyof typeof taskService).mockResolvedValue(undefined as never));

      await taskService.update(USER, ID, { status: "completed" } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "task_projects")).toHaveLength(0);
    });

    it("explicit project_ids: [] clears; explicit [p2] replaces", async () => {
      const spy = vi.spyOn(taskService, "replaceProjectLinks").mockResolvedValue(undefined as never);

      const { client } = makeFakeSb({ tasks: { id: ID, user_id: USER, name: "T" } });
      await taskService.update(USER, ID, { project_ids: [] } as never, { supabase: client as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, [], expect.anything());

      const { client: client2 } = makeFakeSb({ tasks: { id: ID, user_id: USER, name: "T" } });
      await taskService.update(USER, ID, { project_ids: ["22222222-2222-4222-8222-222222222222"] } as never, { supabase: client2 as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, ["22222222-2222-4222-8222-222222222222"], expect.anything());
    });
  });

  describe("contactService.update", () => {
    it("rename-only update issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ contacts: { id: ID, user_id: USER, name: "C" } });

      await contactService.update(USER, ID, { name: "Renamed" } as never, { supabase: client as never });

      expect(junctionWrites(calls, "contact_areas")).toHaveLength(0);
      expect(junctionWrites(calls, "contact_goals")).toHaveLength(0);
      expect(junctionWrites(calls, "contact_projects")).toHaveLength(0);
      // Core's contact↔task junction is named contact_tasks (cloud's was
      // task_contacts — repository divergence recorded in the PR).
      expect(junctionWrites(calls, "contact_tasks")).toHaveLength(0);
    });

    it("explicit area_ids: [] clears the junction (delete issued)", async () => {
      const { client, calls } = makeFakeSb({ contacts: { id: ID, user_id: USER, name: "C" } });

      await contactService.update(USER, ID, { area_ids: [] } as never, { supabase: client as never });

      expect(callsTo(calls, "contact_areas").some((c) => c.op === "delete")).toBe(true);
      // An empty set inserts nothing.
      expect(callsTo(calls, "contact_areas").some((c) => c.op === "insert")).toBe(false);
    });

    it("explicit area_ids: [a1] clears then re-inserts", async () => {
      const { client, calls } = makeFakeSb({ contacts: { id: ID, user_id: USER, name: "C" } });

      await contactService.update(USER, ID, { area_ids: ["33333333-3333-4333-8333-333333333333"] } as never, { supabase: client as never });

      expect(callsTo(calls, "contact_areas").some((c) => c.op === "delete")).toBe(true);
      expect(callsTo(calls, "contact_areas").some((c) => c.op === "insert")).toBe(true);
    });
  });

  describe("goalService.update", () => {
    it("rename-only update issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ goals: { id: ID, user_id: USER, name: "G" } });
      const spy = vi.spyOn(goalService, "replaceAreaLinks").mockResolvedValue(undefined as never);

      await goalService.update(USER, ID, { name: "Renamed" } as never, { supabase: client as never });

      expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "goal_areas")).toHaveLength(0);
    });

    it("explicit area_ids: [] clears; explicit [a1] replaces", async () => {
      const spy = vi.spyOn(goalService, "replaceAreaLinks").mockResolvedValue(undefined as never);

      const { client } = makeFakeSb({ goals: { id: ID, user_id: USER, name: "G" } });
      await goalService.update(USER, ID, { area_ids: [] } as never, { supabase: client as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, [], expect.anything());

      const { client: client2 } = makeFakeSb({ goals: { id: ID, user_id: USER, name: "G" } });
      await goalService.update(USER, ID, { area_ids: ["33333333-3333-4333-8333-333333333333"] } as never, { supabase: client2 as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, ["33333333-3333-4333-8333-333333333333"], expect.anything());
    });
  });

  describe("projectService.update", () => {
    it("rename-only update issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ projects: { id: ID, user_id: USER, name: "P" } });
      const spies = ["replaceAreaLinks", "replaceGoalLinks"]
        .map((m) => vi.spyOn(projectService, m as keyof typeof projectService).mockResolvedValue(undefined as never));

      await projectService.update(USER, ID, { name: "Renamed" } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "project_areas")).toHaveLength(0);
    });

    it("explicit goal_ids: [] clears; explicit [g1] replaces", async () => {
      const spy = vi.spyOn(projectService, "replaceGoalLinks").mockResolvedValue(undefined as never);

      const { client } = makeFakeSb({ projects: { id: ID, user_id: USER, name: "P" } });
      await projectService.update(USER, ID, { goal_ids: [] } as never, { supabase: client as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, [], expect.anything());

      const { client: client2 } = makeFakeSb({ projects: { id: ID, user_id: USER, name: "P" } });
      await projectService.update(USER, ID, { goal_ids: ["44444444-4444-4444-8444-444444444444"] } as never, { supabase: client2 as never });
      expect(spy).toHaveBeenLastCalledWith(USER, ID, ["44444444-4444-4444-8444-444444444444"], expect.anything());
    });
  });

  describe("topicService.update", () => {
    it("rename-only update issues no junction writes", async () => {
      const { client, calls } = makeFakeSb({ topics: { id: ID, user_id: USER, name: "T", area_id: null } });
      const spies = ["linkNotes", "linkResources"]
        .map((m) => vi.spyOn(topicService, m as keyof typeof topicService).mockResolvedValue(undefined as never));

      await topicService.update(USER, ID, { name: "Renamed" } as never, { supabase: client as never });

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(junctionWrites(calls, "topic_areas")).toHaveLength(0);
      // Core has no topic_notes/topic_resources junctions: note/resource
      // links go through linkNotes/linkResources (spied above), which write
      // the notes.topic_id / resources.topic_id scalars.
    });

    it("explicit area_ids: [] clears the junction (delete issued, nothing inserted)", async () => {
      const { client, calls } = makeFakeSb({ topics: { id: ID, user_id: USER, name: "T", area_id: null } });

      await topicService.update(USER, ID, { area_ids: [] } as never, { supabase: client as never });

      expect(callsTo(calls, "topic_areas").some((c) => c.op === "delete")).toBe(true);
      expect(callsTo(calls, "topic_areas").some((c) => c.op === "insert")).toBe(false);
    });
  });
});
