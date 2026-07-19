import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock @tanstack/react-query hydration
vi.mock("@tanstack/react-query", () => ({
  dehydrate: vi.fn(() => ({ mutations: [], queries: [] })),
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock auth + server supabase + makeQueryClient + serverFetch helpers + DashboardContent
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_123" })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ mock: "supabase" })),
}));
vi.mock("@/lib/queries/server-query-client", () => ({
  makeQueryClient: vi.fn(() => {
    const calls: Array<{ queryKey: unknown[] }> = [];
    const qc = {
      prefetchQuery: vi.fn(async (opts: { queryKey: unknown[] }) => {
        calls.push(opts);
        return undefined;
      }),
    };
    (qc as unknown as { _calls: typeof calls })._calls = calls;
    return qc;
  }),
}));
vi.mock("@/lib/queries/areas.queries", () => ({ serverFetchAreas: vi.fn(async () => []) }));
vi.mock("@/lib/queries/goals.queries", () => ({ serverFetchGoals: vi.fn(async () => []) }));
vi.mock("@/lib/queries/projects.queries", () => ({ serverFetchProjects: vi.fn(async () => []) }));
vi.mock("@/lib/queries/tasks.queries", () => ({ serverFetchTasks: vi.fn(async () => []) }));
vi.mock("@/lib/queries/notes.queries", () => ({ serverFetchNotes: vi.fn(async () => []) }));
vi.mock("@/lib/queries/resources.queries", () => ({ serverFetchResources: vi.fn(async () => []) }));
vi.mock("@/lib/queries/topics.queries", () => ({ serverFetchTopics: vi.fn(async () => []) }));
vi.mock("@/lib/queries/contacts.queries", () => ({ serverFetchContacts: vi.fn(async () => []) }));

// The actual DashboardContent is a client component — mock it to a no-op
vi.mock("@/app/(dashboard)/dashboard/dashboard-content", () => ({
  DashboardContent: () => null,
}));

import { auth } from "@clerk/nextjs/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";

const makeQueryClientMock = makeQueryClient as unknown as {
  (): {
    prefetchQuery: (opts: { queryKey: unknown[] }) => Promise<void>;
  } & { _calls: Array<{ queryKey: unknown[] }> };
};

describe("dashboard page prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the _calls array on each test
    const calls: Array<{ queryKey: unknown[] }> = [];
    const qc = {
      prefetchQuery: vi.fn(async (opts: { queryKey: unknown[] }) => {
        calls.push(opts);
        return undefined;
      }),
    };
    (qc as unknown as { _calls: typeof calls })._calls = calls;
    vi.mocked(makeQueryClient).mockReturnValue(
      qc as ReturnType<typeof makeQueryClient> & { _calls: typeof calls },
    );
  });

  it("prefetches all 8 dashboard query keys", async () => {
    const { default: DashboardPage } = await import("@/app/(dashboard)/dashboard/page");
    // DashboardPage is an async server component, call it
    await DashboardPage();

    const qc = makeQueryClient() as ReturnType<typeof makeQueryClient> & {
      _calls: Array<{ queryKey: unknown[] }>;
    };
    const calls = qc._calls;
    expect(calls).toHaveLength(8);

    const keys = calls.map((c) => JSON.stringify(c.queryKey));
    // Areas
    expect(keys).toContain(JSON.stringify(["areas", "list", "user_123", {}]));
    // Goals
    expect(keys).toContain(JSON.stringify(["goals", { status: "all" }]));
    // Projects
    expect(keys).toContain(JSON.stringify(["projects", { status: "all" }]));
    // Notes
    expect(keys).toContain(
      JSON.stringify(["notes", "list", "user_123", { includeArchived: true }]),
    );
    // Resources
    expect(keys).toContain(
      JSON.stringify(["resources", "list", "user_123", { status: "all" }]),
    );
    // Tasks
    expect(keys).toContain(JSON.stringify(["tasks"]));
    // Topics
    expect(keys).toContain(JSON.stringify(["topics", "list", "user_123"]));
    // Contacts
    expect(keys).toContain(JSON.stringify(["contacts", { archive: false }]));

    expect(auth).toHaveBeenCalledTimes(1);
  });
});
