import { describe, it, expect, vi, beforeEach } from "vitest";

let mockRow: any = null;
let deleteCalls: any[] = [];
let updateLog: any[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createMockAdmin(),
}));

vi.mock("@/lib/api/ai-access-service", () => ({ setAiAccessSettings: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/api-key-service", () => ({ revokeAllApiKeysForUser: vi.fn(async () => 0) }));
vi.mock("@/lib/audit/audit-service", () => ({ recordAuditEvent: vi.fn(async () => {}) }));

function createMockAdmin() {
  return {
    from(table: string) {
      return {
        delete() {
          return {
            eq(col: string, val: string) {
              deleteCalls.push({ table, col, val });
              return Promise.resolve({ data: null, error: null } as any);
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(col: string, val: string) {
              // Return builder that supports second .eq and is thenable
              const builder: any = {
                eq(col2: string, val2: string) {
                  // Claim pattern (.update(...).eq().eq().select().maybeSingle()):
                  // the row is returned only while still "scheduled", so a
                  // cancelled or concurrently-claimed request claims nothing.
                  if (
                    table === "account_deletion_requests" &&
                    (patch.status === "processing" || patch.status === "cancelled")
                  ) {
                    const result = Promise.resolve({ data: null, error: null } as any);
                    return {
                      then: result.then.bind(result),
                      select() {
                        return {
                          maybeSingle: async () => {
                            if (!mockRow || mockRow.status !== "scheduled") {
                              updateLog.push({ table, patch, col, val, col2, val2, affected: 0, viaSelect: true });
                              return { data: null, error: null };
                            }
                            mockRow.status = patch.status as string;
                            updateLog.push({ table, patch, col, val, col2, val2, affected: 1, viaSelect: true });
                            return { data: { ...mockRow }, error: null };
                          },
                        };
                      },
                    };
                  }
                  // final update with two eq (future fixed code path)
                  if (table === "account_deletion_requests" && (patch.status === "completed" || patch.status === "failed")) {
                    // fixed code will do .eq("id", claimedId).eq("status","processing")
                    if (mockRow && mockRow.status !== "processing") {
                      updateLog.push({ table, patch, col, val, col2, val2, affected: 0, final: true });
                      return Promise.resolve({ data: null, error: null } as any);
                    }
                    if (mockRow) { mockRow.status = patch.status as string; mockRow.completed_at = new Date().toISOString(); }
                    updateLog.push({ table, patch, col, val, col2, val2, affected: 1, final: true });
                    return Promise.resolve({ data: mockRow, error: null } as any);
                  }
                  updateLog.push({ table, patch, col, val, col2, val2 });
                  return Promise.resolve({ data: null, error: null } as any);
                },
                // Make first eq itself thenable for single-eq final update path
                then(onFulfilled: any, onRejected: any) {
                  // single-eq final update: .update({completed}).eq("clerk_user_id", userId)
                  if (table === "account_deletion_requests" && (patch.status === "completed" || patch.status === "failed")) {
                    updateLog.push({ table, patch, col, val, singleEqFinal: true });
                    if (mockRow) {
                      // BUG: overwrites any status (cancelled -> completed)
                      mockRow.status = patch.status as string;
                      mockRow.completed_at = new Date().toISOString();
                    }
                    return Promise.resolve({ data: null, error: null } as any).then(onFulfilled, onRejected);
                  }
                  if (table === "account_deletion_requests" && patch.status === "processing") {
                    // processing with single eq shouldn't happen in current code, but handle
                    return Promise.resolve({ data: null, error: null } as any).then(onFulfilled, onRejected);
                  }
                  return Promise.resolve({ data: null, error: null } as any).then(onFulfilled, onRejected);
                },
                // support .select().maybeSingle() chaining for fixed code claim check
                select() {
                  return {
                    maybeSingle: async () => {
                      if (table === "account_deletion_requests" && patch.status === "processing") {
                        if (mockRow && mockRow.status !== "scheduled") {
                          updateLog.push({ table, patch, col, val, affected: 0, viaSelect: true });
                          return { data: null, error: null };
                        }
                        if (mockRow) mockRow.status = "processing";
                        updateLog.push({ table, patch, col, val, affected: 1, viaSelect: true });
                        return { data: mockRow, error: null };
                      }
                      return { data: null, error: null };
                    },
                  };
                },
              };
              // attach select to builder for claim-with-select path
              return builder;
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        maybeSingle: async () => ({ data: mockRow, error: null }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
        insert() {
          return { select() { return { single: async () => ({ data: mockRow, error: null }) } } };
        },
      };
    },
  };
}

import { finalizeAccountDeletion } from "@/lib/privacy/account-deletion";

beforeEach(() => {
  deleteCalls = [];
  updateLog = [];
  mockRow = {
    id: "req-1",
    clerk_user_id: "user_victim",
    requested_at: "2026-07-01T00:00:00.000Z",
    scheduled_for: "2026-07-01T00:00:00.000Z",
    cancelled_at: null,
    completed_at: null,
    status: "scheduled",
    failure_code: null,
  };
});

describe("TOCTOU regression (claim-gated finalize)", () => {
  it("cancel vs finalize: finalize refuses to purge after cancel", async () => {
    mockRow.status = "cancelled";
    mockRow.cancelled_at = new Date().toISOString();
    // Pre-fix this purged and overwrote the cancelled row (documented in git
    // history). The claim update now matches only status="scheduled", so the
    // finalize must fail without purging.
    await expect(finalizeAccountDeletion("user_victim")).rejects.toThrow(
      /No scheduled deletion request to finalize/,
    );
    expect(deleteCalls.length).toBe(0);
    expect(mockRow.status).toBe("cancelled");
  });

  it("double finalize: only the claim winner purges", async () => {
    mockRow.status = "scheduled";
    deleteCalls = [];
    updateLog = [];
    // Both calls race for the status="processing" claim; only one may win.
    const results = await Promise.allSettled([
      finalizeAccountDeletion("user_victim"),
      finalizeAccountDeletion("user_victim"),
    ]);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(deleteCalls.length).toBeGreaterThan(0);
    expect(mockRow.status).toBe("completed");
  });
});
