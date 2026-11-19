import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contactService } from "@/lib/services/contact.service";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F8
 * (src/lib/services/contact.service.ts.createLog-unowned-contact-id, low).
 *
 * The message-bearing branch of POST /api/v1/contacts/:id/log inserted
 * contact_logs with no ownership read on the contact (every sibling link
 * writer calls getById first), the contact_logs FK is existence-only, the RLS
 * policy binds user_id only, and trg_contact_logs_update_interaction updates
 * contacts by bare id — so a foreign contact_id persisted an attacker log row
 * and mutated the victim's last_interaction_at under the service-role client.
 */

const CONTACT_A = "00000000-0000-4000-8000-00000000000a";
const CONTACT_B = "00000000-0000-4000-8000-00000000000b";
const NO_SUCH = "00000000-0000-4000-8000-00000000ffff";

type RecordedOp = {
  table: string;
  op: string;
  payload?: unknown;
  filters: Array<{ column: string; value: unknown }>;
};

function applyFilters(rows: Array<Record<string, unknown>>, filters: Array<{ column: string; value: unknown }>) {
  return rows.filter((row) =>
    filters.every((f) => (Array.isArray(f.value) ? f.value.includes(row[f.column]) : row[f.column] === f.value)),
  );
}

/**
 * Filter-aware in-memory Supabase stub: eq filters are applied on read, and
 * single() emulates PostgREST PGRST116 when no row matches (the shape
 * getById relies on). FK semantics for contact_logs match migration
 * 20260516000000:8 (insert fails only when the contact does not exist at all
 * — any owner); `forceInsertError` emulates the race where the row vanishes
 * between the ownership gate and the insert.
 */
function makeStub(opts: {
  contacts: Array<Record<string, unknown>>;
  forceInsertError?: { code: string; message: string } | null;
}) {
  const ops: RecordedOp[] = [];
  const builder = (table: string) => {
    const state = {
      fkError: null as { code: string; message: string } | null,
      mode: "select",
      filters: [] as Array<{ column: string; value: unknown }>,
      inserted: null as Record<string, unknown> | null,
    };
    const b = {
      select(_cols?: string) {
        ops.push({ table, op: state.mode === "insert" ? "insert-select" : "select" });
        return b;
      },
      insert(row: Record<string, unknown>) {
        state.mode = "insert";
        state.inserted = row;
        ops.push({ table, op: "insert", payload: row });
        if (table === "contact_logs" && !opts.forceInsertError) {
          const exists = opts.contacts.some((c) => c.id === row.contact_id);
          if (!exists) {
            state.fkError = { code: "23503", message: "violates foreign key constraint" };
          }
        }
        return b;
      },
      update(row: Record<string, unknown>) {
        state.mode = "update";
        ops.push({ table, op: "update", payload: row });
        return {
          eq(column: string, value: unknown) {
            state.filters.push({ column, value });
            ops.push({ table, op: "update-eq", filters: [{ column, value }] });
            return b;
          },
        };
      },
      eq(column: string, value: unknown) {
        state.filters.push({ column, value });
        ops.push({ table, op: "filter", filters: [{ column, value }] });
        return b;
      },
      in(column: string, values: unknown[]) {
        state.filters.push({ column, value: values });
        ops.push({ table, op: "filter", filters: [{ column, value: values }] });
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
        if (state.mode === "insert") {
          const error = opts.forceInsertError ?? state.fkError;
          if (error) return Promise.resolve({ data: null, error });
          return Promise.resolve({ data: { ...(state.inserted ?? {}), id: "log-1" }, error: null });
        }
        const matched = applyFilters(opts.contacts, state.filters);
        if (matched.length > 0) {
          return Promise.resolve({ data: matched[0], error: null });
        }
        return Promise.resolve({ data: null, error: { code: "PGRST116", message: "Row not found" } });
      },
      maybeSingle() {
        return b.single();
      },
      then(onF: (result: { data: unknown[]; error: null }) => unknown, onR: (e: unknown) => unknown) {
        const matched = applyFilters(opts.contacts, state.filters);
        return Promise.resolve({ data: matched, error: null }).then(onF, onR);
      },
    };
    return b;
  };
  return {
    ops,
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

const CONTACTS = [
  { id: CONTACT_A, user_id: "user-A", name: "Own contact", last_interaction_at: null },
  { id: CONTACT_B, user_id: "user-B", name: "Victim contact", last_interaction_at: null },
];

describe("contact log writes bind contact_id to the caller (audit F8)", () => {
  it("createLog with a foreign contact id is rejected before any insert", async () => {
    const stub = makeStub({ contacts: CONTACTS });

    await expect(
      contactService.createLog("user-A", CONTACT_B, { message: "seed-1" }, { supabase: stub.supabase }),
    ).rejects.toThrow();

    const inserts = stub.ops.filter((o) => o.table === "contact_logs" && o.op === "insert");
    expect(inserts).toEqual([]);
    const contactRead = stub.ops.find((o) => o.table === "contacts");
    expect(contactRead).toBeDefined();
  });

  it("createLog with a nonexistent contact id returns the ownership denial shape (404, not a 500 oracle)", async () => {
    const stub = makeStub({ contacts: CONTACTS });

    await expect(
      contactService.createLog("user-A", NO_SUCH, { message: "x" }, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.ops.filter((o) => o.table === "contact_logs" && o.op === "insert")).toEqual([]);
  });

  it("createLog for an owned contact still records the log (no functional regression)", async () => {
    const stub = makeStub({ contacts: CONTACTS });

    const log = await contactService.createLog("user-A", CONTACT_A, { message: "seed-1" }, {
      supabase: stub.supabase,
    });

    expect(log.contact_id).toBe(CONTACT_A);
    const inserts = stub.ops.filter((o) => o.table === "contact_logs" && o.op === "insert");
    expect(inserts).toHaveLength(1);
  });

  it("an FK race after the gate maps to the ownership denial shape, not a 500 oracle", async () => {
    const stub = makeStub({
      contacts: CONTACTS,
      forceInsertError: { code: "23503", message: "violates foreign key constraint" },
    });

    await expect(
      contactService.createLog("user-A", CONTACT_A, { message: "x" }, { supabase: stub.supabase }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
