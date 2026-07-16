/**
 * Drives shipped finalizeAccountDeletion / processDue / isAccountDeletionDue
 * with a real admin-client mock that records scoped deletes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const deleteCalls: Array<{ table: string; column: string; userId: string }> =
  [];
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

function chainableEq(table: string, op: "delete" | "update", patch?: Record<string, unknown>) {
  return {
    eq(column: string, userId: string) {
      if (op === "delete") {
        deleteCalls.push({ table, column, userId });
        // support second .eq for status filter on updates
        return {
          eq: () => Promise.resolve({ data: null, error: null }),
          then: undefined,
          // supabase returns promise-like after final eq for delete
        };
      }
      // update().eq().eq()
      return {
        eq: () => {
          updates.push({ table, patch: patch ?? {} });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      return {
        delete: () => ({
          eq(column: string, userId: string) {
            deleteCalls.push({ table, column, userId });
            return Promise.resolve({ data: null, error: null });
          },
        }),
        update: (patch: Record<string, unknown>) => ({
          eq(column: string, userId: string) {
            // track status transitions; allow chained .eq
            updates.push({ table, patch: { ...patch, _eq: `${column}=${userId}` } });
            return {
              eq: () => Promise.resolve({ data: null, error: null }),
            };
          },
        }),
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: scheduledRow,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: scheduledRow, error: null }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  setAiAccessSettings: vi.fn(async () => ({})),
  getAiAccessSettings: vi.fn(async () => ({
    ai_access_enabled: false,
    ai_write_access_enabled: false,
    privacy_notice_version: null,
    privacy_notice_accepted_at: null,
  })),
}));

vi.mock("@/lib/api/api-key-service", () => ({
  revokeAllApiKeysForUser: vi.fn(async () => 2),
  listApiKeys: vi.fn(async () => []),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  recordAuditEvent: vi.fn(async () => {}),
}));

import {
  finalizeAccountDeletion,
  processDueAccountDeletion,
  isAccountDeletionDue,
  ACCOUNT_DELETION_TABLE_ORDER,
  type AccountDeletionRequest,
} from "@/lib/privacy/account-deletion";

let scheduledRow: AccountDeletionRequest | null = null;

beforeEach(() => {
  deleteCalls.length = 0;
  updates.length = 0;
  scheduledRow = {
    id: "del1",
    clerk_user_id: "user_victim",
    requested_at: "2026-07-01T00:00:00.000Z",
    scheduled_for: "2026-07-01T00:00:00.000Z", // already due
    cancelled_at: null,
    completed_at: null,
    status: "scheduled",
    failure_code: null,
  };
});

describe("isAccountDeletionDue", () => {
  it("is true when scheduled_for is in the past", () => {
    expect(
      isAccountDeletionDue(
        "2020-01-01T00:00:00.000Z",
        new Date("2026-07-16T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isAccountDeletionDue(
        "2099-01-01T00:00:00.000Z",
        new Date("2026-07-16T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("finalizeAccountDeletion (shipped purge)", () => {
  it("deletes product tables scoped to the same userId and marks request completed", async () => {
    const result = await finalizeAccountDeletion("user_victim");

    // Primary entities must be purged with user_id filter
    const taskDeletes = deleteCalls.filter((c) => c.table === "tasks");
    expect(taskDeletes.length).toBeGreaterThanOrEqual(1);
    expect(taskDeletes.every((c) => c.column === "user_id" && c.userId === "user_victim")).toBe(
      true,
    );

    const areaDeletes = deleteCalls.filter((c) => c.table === "areas");
    expect(areaDeletes.every((c) => c.userId === "user_victim")).toBe(true);

    const keyDeletes = deleteCalls.filter((c) => c.table === "api_keys");
    expect(keyDeletes.some((c) => c.column === "user_id" && c.userId === "user_victim")).toBe(
      true,
    );

    // audit_events uses clerk_user_id
    const auditDeletes = deleteCalls.filter((c) => c.table === "audit_events");
    expect(
      auditDeletes.every(
        (c) => c.column === "clerk_user_id" && c.userId === "user_victim",
      ),
    ).toBe(true);

    // Must not delete billing_events (not in order)
    expect(deleteCalls.some((c) => c.table === "billing_events")).toBe(false);

    // At least core tables from planner attempted
    for (const core of ["tasks", "notes", "areas", "api_keys", "user_settings"]) {
      expect(ACCOUNT_DELETION_TABLE_ORDER).toContain(core);
      expect(deleteCalls.some((c) => c.table === core)).toBe(true);
    }

    expect(result.failed).toEqual([]);
    expect(result.cleared.length).toBeGreaterThan(5);

    // Status updated to completed
    expect(
      updates.some(
        (u) =>
          u.table === "account_deletion_requests" &&
          u.patch.status === "completed",
      ),
    ).toBe(true);
  });

  it("does not issue deletes for a different user id", async () => {
    await finalizeAccountDeletion("user_only_me");
    expect(deleteCalls.every((c) => c.userId === "user_only_me")).toBe(true);
    expect(deleteCalls.some((c) => c.userId === "user_victim")).toBe(false);
  });
});

describe("processDueAccountDeletion", () => {
  it("runs finalize when scheduled_for is past", async () => {
    scheduledRow = {
      id: "del1",
      clerk_user_id: "user_due",
      requested_at: "2026-07-01T00:00:00.000Z",
      scheduled_for: "2026-07-01T00:00:00.000Z",
      cancelled_at: null,
      completed_at: null,
      status: "scheduled",
      failure_code: null,
    };
    const out = await processDueAccountDeletion(
      "user_due",
      new Date("2026-07-16T00:00:00.000Z"),
    );
    expect(out.processed).toBe(true);
    expect(out.result?.cleared.length).toBeGreaterThan(0);
    expect(deleteCalls.some((c) => c.userId === "user_due")).toBe(true);
  });

  it("skips finalize when grace has not elapsed", async () => {
    deleteCalls.length = 0;
    scheduledRow = {
      id: "del1",
      clerk_user_id: "user_wait",
      requested_at: "2026-07-16T00:00:00.000Z",
      scheduled_for: "2099-01-01T00:00:00.000Z",
      cancelled_at: null,
      completed_at: null,
      status: "scheduled",
      failure_code: null,
    };
    const out = await processDueAccountDeletion(
      "user_wait",
      new Date("2026-07-16T00:00:00.000Z"),
    );
    expect(out.processed).toBe(false);
    expect(deleteCalls.filter((c) => c.table === "tasks")).toHaveLength(0);
  });
});
