/**
 * Link-endpoint error normalization (plan Task 6, report recommendation 5).
 *
 * Foreign-UUID attempts on link endpoints must never produce a distinct 500:
 * (1) existent-foreign and non-existent-foreign ids must be denied with the
 * SAME status + code (no existence oracle), and (2) a junction write that
 * races past the ownership guard into an FK violation must map to the same
 * denial shape instead of a raw DATABASE_ERROR 500.
 */
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { contactService } from "@/lib/services/contact.service";
import { resourceService } from "@/lib/services/resource.service";
import { topicService } from "@/lib/services/topic.service";

const USER = "user-caller";
const OWNED_A = "11111111-1111-4111-8111-111111111111";
const FOREIGN_EXISTENT = "22222222-2222-4222-8222-222222222222";
const FOREIGN_MISSING = "33333333-3333-4333-8333-333333333333";

/** Client where `ownedBy[table]` lists ids the caller owns. Writes record. */
function makeClient(opts: {
  ownedBy?: Record<string, string[]>;
  writeError?: { message: string; code?: string } | null;
}) {
  const writes: Array<{ table: string; op: string }> = [];
  function chain(table: string) {
    const api: Record<string, unknown> = {};
    let writeMode = false;
    api.select = () => api;
    api.eq = () => api;
    api.in = () => {
      if (writeMode) return finish("update");
      return Promise.resolve({
        data: (opts.ownedBy?.[table] ?? []).map((id) => ({ id })),
        error: null,
      });
    };
    const finish = (op: string) => {
      writes.push({ table, op });
      return Promise.resolve({ data: null, error: opts.writeError ?? null });
    };
    api.insert = () => finish("insert");
    api.upsert = () => finish("upsert");
    api.delete = () => finish("delete");
    api.update = () => {
      writeMode = true;
      return api;
    };
    api.maybeSingle = async () => ({ data: null, error: null });
    api.single = async () => ({
      data: (opts.ownedBy?.[table] ?? [])[0]
        ? { id: (opts.ownedBy?.[table] ?? [])[0], user_id: USER }
        : null,
      error: null,
    });
    return api;
  }
  return {
    from: (table: string) => chain(table),
    _writes: writes,
  } as unknown as SupabaseClient & { _writes: Array<{ table: string; op: string }> };
}

describe("link-endpoint error normalization", () => {
  it("denies existent-foreign and non-existent-foreign ids with identical status + code", async () => {
    // contact.linkToGoal: existent-foreign goal -> assertOwnedIds 404
    const existent = await contactService
      .linkToGoal(USER, "contact-1", FOREIGN_EXISTENT, {
        supabase: makeClient({ ownedBy: { contacts: ["contact-1"], goals: [] } }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    const missing = await contactService
      .linkToGoal(USER, "contact-1", FOREIGN_MISSING, {
        supabase: makeClient({ ownedBy: { contacts: ["contact-1"], goals: [] } }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    expect(existent).toMatchObject({ statusCode: 404 });
    expect(missing).toMatchObject({ statusCode: 404 });
    // The oracle: both cases must be indistinguishable in status and code.
    expect(missing).toEqual(existent);
  });

  it("maps an FK-violation race past the guard to the denial shape (no 500)", async () => {
    const fk = {
      message: 'insert or update on table "goal_notes" violates foreign key constraint "goal_notes_note_id_fkey"',
      code: "23503",
    };

    // resource.replaceGoalLinks: guard sees the goal as owned, then the write
    // hits the FK violation (row vanished between check and write).
    const resource = await resourceService
      .replaceGoalLinks(USER, "resource-1", [OWNED_A], {
        supabase: makeClient({ ownedBy: { resources: [OWNED_A], goals: [OWNED_A] }, writeError: fk }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    expect(resource.statusCode).toBe(403);
    expect(resource.code).not.toBe("DATABASE_ERROR");

    // contact.linkToGoal: same race
    const contact = await contactService
      .linkToGoal(USER, "contact-1", OWNED_A, {
        supabase: makeClient({ ownedBy: { contacts: ["contact-1"], goals: [OWNED_A] }, writeError: fk }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    expect(contact.statusCode).toBe(403);
    expect(contact.code).not.toBe("DATABASE_ERROR");

    // topic.linkNotes: same race on the tenant-scoped UPDATE
    const topic = await topicService
      .linkNotes(USER, "topic-1", [OWNED_A], {
        supabase: makeClient({ ownedBy: { notes: [OWNED_A] }, writeError: fk }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    expect(topic.statusCode).toBe(403);
    expect(topic.code).not.toBe("DATABASE_ERROR");
  });

  it("non-FK write failures still surface as database errors (no over-masking)", async () => {
    const dbDown = { message: "connection terminated unexpectedly" };
    const result = await resourceService
      .replaceGoalLinks(USER, "resource-1", [OWNED_A], {
        supabase: makeClient({ ownedBy: { resources: [OWNED_A], goals: [OWNED_A] }, writeError: dbDown }),
      })
      .then(
        () => "resolved" as const,
        (e: { statusCode?: number; code?: string }) => ({
          statusCode: e.statusCode,
          code: e.code,
        }),
      );
    expect(result).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
  });
});
