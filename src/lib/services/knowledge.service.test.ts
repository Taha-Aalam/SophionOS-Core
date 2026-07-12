import { describe, it, expect, vi } from "vitest";

// Build a recording supabase client that captures the filter args passed to
// `.ilike()` / `.or()` on each table, then returns empty rows.
function makeRecordingClient() {
  const calls: Record<string, { ilike?: [string, string]; or?: string }> = {};
  const makeChain = (table: string) => {
    const rec: { ilike?: [string, string]; or?: string } = {};
    calls[table] = rec;
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      ilike: (col: string, val: string) => {
        rec.ilike = [col, val];
        return chain;
      },
      or: (filter: string) => {
        rec.or = filter;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
    };
    return chain;
  };
  return {
    client: { from: vi.fn((t: string) => makeChain(t)) },
    calls,
  };
}

import { knowledgeService } from "@/lib/services/knowledge.service";

describe("knowledgeService.search", () => {
  it("uses `*` wildcards so the gateway's double percent-decode can't break ILIKE", async () => {
    const { client, calls } = makeRecordingClient();
    await knowledgeService.search("user-1", "react", { supabase: client as never });

    // Notes + topics use `.ilike(name, ...)` directly.
    expect(calls.notes?.ilike?.[1]).toBe("*react*");
    expect(calls.topics?.ilike?.[1]).toBe("*react*");
    // Resources combine name + url via `.or(...)`.
    expect(calls.resources?.or).toBe("name.ilike.*react*,url.ilike.*react*");
    // No `%` wildcards anywhere — those get mangled by the live gateway.
    const allArgs = JSON.stringify(calls);
    expect(allArgs).not.toContain("%react%");
  });

  it("returns empty results for a blank query without hitting the db", async () => {
    const { client, calls } = makeRecordingClient();
    const res = await knowledgeService.search("user-1", "   ", { supabase: client as never });
    expect(res.resources).toEqual([]);
    expect(res.counts).toEqual({ notes: 0, resources: 0, topics: 0 });
    expect(Object.keys(calls)).toHaveLength(0);
  });
});
