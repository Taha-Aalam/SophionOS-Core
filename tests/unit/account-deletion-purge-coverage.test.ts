import { describe, expect, it, vi } from "vitest";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F3
 * (privacy/account-deletion.ts:ACCOUNT_DELETION_TABLE_ORDER.omits-provider_credentials, medium).
 *
 * ACCOUNT_DELETION_TABLE_ORDER was authored before provider_credentials
 * shipped (2026-10-25) and never extended: the purge loop deletes only the
 * listed tables, there is no cascade/trigger/webhook/cron cleanup, and the
 * finalize status write marks the erasure "completed" with failure_code null
 * — so encrypted BYOAK provider keys plus plaintext provider metadata
 * survive a reported-complete erasure. note_types, api_rate_limits and
 * user_entity_counts have the same gap (user_entity_counts is keyed by
 * clerk_user_id, so it needs the audit_events-style scoped branch — a
 * list-only add would 42703 into the silent "does not exist" skip).
 */

const deleteCalls: Array<{ table: string; column: string; userId: string }> = [];
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
const scheduledRow = { id: "del-1", status: "scheduled" };

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
            updates.push({ table, patch: { ...patch, _eq: `${column}=${userId}` } });
            const isClaim =
              table === "account_deletion_requests" && patch.status === "processing";
            const claimed = isClaim && scheduledRow.status === "scheduled"
              ? { id: scheduledRow.id, status: "processing" }
              : null;
            return {
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: claimed, error: null }),
                }),
              }),
            };
          },
        }),
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: scheduledRow, error: null }),
              }),
            }),
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
  revokeAllApiKeysForUser: vi.fn(async () => 0),
  listApiKeys: vi.fn(async () => []),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  recordAuditEvent: vi.fn(async () => {}),
}));

import {
  finalizeAccountDeletion,
  planAccountDeletionTables,
} from "@/lib/privacy/account-deletion";

describe("account-deletion purge covers every user-owned table (audit F3)", () => {
  it("the purge plan includes provider_credentials, note_types, api_rate_limits and user_entity_counts", () => {
    const plan = planAccountDeletionTables();
    for (const table of ["provider_credentials", "note_types", "api_rate_limits", "user_entity_counts"]) {
      expect(plan, `${table} must be in the purge plan`).toContain(table);
    }
  });

  it("finalize deletes provider_credentials (user_id-scoped) and user_entity_counts (clerk_user_id-scoped)", async () => {
    deleteCalls.length = 0;
    updates.length = 0;

    const result = await finalizeAccountDeletion("user_victim");

    const providerDelete = deleteCalls.find((c) => c.table === "provider_credentials");
    expect(providerDelete).toBeDefined();
    expect(providerDelete?.column).toBe("user_id");
    expect(providerDelete?.userId).toBe("user_victim");

    const counterDelete = deleteCalls.find((c) => c.table === "user_entity_counts");
    expect(counterDelete).toBeDefined();
    expect(counterDelete?.column).toBe("clerk_user_id");
    expect(counterDelete?.userId).toBe("user_victim");

    // The erasure is only reported complete when the plan actually covered
    // the credential table.
    const finalizeUpdate = updates.find(
      (u) => u.table === "account_deletion_requests" && (u.patch.status === "completed" || u.patch.status === "failed"),
    );
    expect(finalizeUpdate?.patch.status).toBe("completed");
    expect(result.failed).toEqual([]);
  });
});
