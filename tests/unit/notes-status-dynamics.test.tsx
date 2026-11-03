// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Dynamic-update proof for the notes status family (docs/prompts/fix-dynamics).
 *
 * The owner's report: checking a note complete and unchecking it again did not
 * reliably update the visible status until a refresh. These tests exercise the
 * real hook + real QueryClient with only the network service mocked, so they
 * fail on the old invalidation-only implementation (no optimistic state, so the
 * cache still reads "inbox" until an unrelated action reloads it) and pass with
 * the optimistic + reconciled pattern.
 */

const mockUpdate = vi.fn();
const mockList = vi.fn();

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user_1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/services/dashboard.service", () => ({
  DASHBOARD_QUERY_KEY: "dashboard",
}));

vi.mock("@/lib/services/note.service", () => ({
  noteService: {
    update: (...args: unknown[]) => mockUpdate(...args),
    list: (...args: unknown[]) => mockList(...args),
  },
}));

const mockUpdateResource = vi.fn();

vi.mock("@/lib/services/resource.service", () => ({
  resourceService: {
    update: (...args: unknown[]) => mockUpdateResource(...args),
  },
}));

import { toast } from "sonner";
import { AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { NOTES_QUERY_KEY, useUpdateNote } from "@/lib/hooks/use-notes";
import { RESOURCES_QUERY_KEY, useUpdateResource } from "@/lib/hooks/use-resources";

const NOTE_ID = "note-1";
const USER_ID = "user_1";
const LIST_KEY = [NOTES_QUERY_KEY, "list", USER_ID, { includeArchived: true }] as const;
const DETAIL_KEY = [NOTES_QUERY_KEY, "detail", USER_ID, NOTE_ID] as const;
const AREA_KEY = [AREA_DETAIL_QUERY_KEY, "area-1"] as const;
const GOAL_KEY = [GOAL_DETAIL_QUERY_KEY, "goal-1"] as const;

const baseNote = {
  id: NOTE_ID,
  slug: "note-one",
  name: "Note one",
  status: "inbox",
  type: "note",
  favorite: false,
  pin: false,
  is_archived: false,
  notebooks: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let client: QueryClient;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function seed() {
  client.setQueryData(LIST_KEY, [{ ...baseNote }]);
  client.setQueryData(DETAIL_KEY, { ...baseNote });
  client.setQueryData(AREA_KEY, {
    area: { id: "area-1" },
    notes: [{ ...baseNote }],
    allNotes: [{ ...baseNote }],
    tasks: [],
    rollups: { noteCount: 1 },
  });
  client.setQueryData(GOAL_KEY, { notes: [{ ...baseNote }] });
}

const listCache = () => client.getQueryData<typeof baseNote[]>(LIST_KEY) ?? [];
const detailCache = () => client.getQueryData<typeof baseNote>(DETAIL_KEY);
const areaNotes = () =>
  client.getQueryData<{ notes: typeof baseNote[] }>(AREA_KEY)?.notes ?? [];
const areaCompletedCount = () =>
  areaNotes().filter((note) => note.status === "completed").length;
const goalNotes = () =>
  client.getQueryData<{ notes: typeof baseNote[] }>(GOAL_KEY)?.notes ?? [];

beforeEach(() => {
  client = makeClient();
  mockUpdate.mockReset();
  mockList.mockReset();
  vi.mocked(toast.error).mockReset();
  seed();
});

describe("note status is dynamic across every rendered copy", () => {
  it("updates list, detail and parent copies immediately and reverses exactly", async () => {
    const pending = deferred<typeof baseNote>();
    mockUpdate.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    act(() => {
      result.current.mutate({ id: NOTE_ID, input: { status: "completed" } });
    });

    // Before the server answers: every copy already shows "completed".
    await waitFor(() => expect(listCache()[0].status).toBe("completed"));
    expect(detailCache()?.status).toBe("completed");
    expect(areaNotes()[0].status).toBe("completed");
    expect(areaCompletedCount()).toBe(1);
    expect(goalNotes()[0].status).toBe("completed");

    await act(async () => {
      pending.resolve({ ...baseNote, status: "completed" });
      await pending.promise;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reverse: back to the exact starting state, immediately.
    mockUpdate.mockResolvedValueOnce({ ...baseNote, status: "inbox" });
    await act(async () => {
      await result.current.mutateAsync({ id: NOTE_ID, input: { status: "inbox" } });
    });

    expect(listCache()[0].status).toBe("inbox");
    expect(detailCache()?.status).toBe("inbox");
    expect(areaNotes()[0].status).toBe("inbox");
    expect(areaCompletedCount()).toBe(0);
    expect(goalNotes()[0].status).toBe("inbox");
  });

  it("rolls the optimistic state back and surfaces an error when the save fails", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("save failed"));

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: NOTE_ID, input: { status: "completed" } }),
      ).rejects.toThrow("save failed");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Prior UI restored — no false success.
    expect(listCache()[0].status).toBe("inbox");
    expect(detailCache()?.status).toBe("inbox");
    expect(areaNotes()[0].status).toBe("inbox");
    expect(areaCompletedCount()).toBe(0);
    expect(toast.error).toHaveBeenCalledWith("save failed");
  });

  it("ends at the final intent when reversed before the first request settles", async () => {
    const first = deferred<typeof baseNote>();
    const second = deferred<typeof baseNote>();
    mockUpdate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    act(() => {
      result.current.mutate({ id: NOTE_ID, input: { status: "completed" } });
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.mutate({ id: NOTE_ID, input: { status: "inbox" } });
    });

    // Second request is queued behind the first, not raced against it, and the
    // optimistic state already reflects the newest click.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(listCache()[0].status).toBe("inbox"));

    await act(async () => {
      first.resolve({ ...baseNote, status: "completed" });
      await first.promise;
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve({ ...baseNote, status: "inbox" });
      await second.promise;
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The late first response must not resurrect "completed".
    expect(listCache()[0].status).toBe("inbox");
    expect(detailCache()?.status).toBe("inbox");
  });
});

describe("stale navigation", () => {
  it("invalidates inactive note + dashboard caches with refetchType all", async () => {
    mockUpdate.mockResolvedValue({ ...baseNote, status: "completed" });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateNote(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: NOTE_ID, input: { status: "completed" } });
    });

    // Default invalidation only refetches active queries; an observer-less
    // list/dashboard cache would keep the old value until a manual reload.
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [NOTES_QUERY_KEY],
        refetchType: "all",
      }),
    );
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["dashboard"],
        refetchType: "all",
      }),
    );
  });
});

const RES_LIST_KEY = [RESOURCES_QUERY_KEY, "list", USER_ID, {}] as const;
const baseResource = {
  id: "res-1",
  name: "Resource one",
  status: "inbox",
  is_archived: false,
  favorite: false,
};

function seedResource() {
  client.setQueryData(RES_LIST_KEY, [{ ...baseResource }]);
  client.setQueryData(AREA_KEY, {
    area: { id: "area-1" },
    resources: [{ ...baseResource }],
    allResources: [{ ...baseResource }],
    notes: [],
    tasks: [],
    rollups: { resourceCount: 1 },
  });
}

const resourceListCache = () =>
  client.getQueryData<typeof baseResource[]>(RES_LIST_KEY) ?? [];
const areaResources = () =>
  client.getQueryData<{ resources: typeof baseResource[] }>(AREA_KEY)?.resources ?? [];

beforeEach(() => {
  mockUpdateResource.mockReset();
});

describe("resource status uses the same dynamic pattern (area-detail checkbox)", () => {
  it("updates list and parent copies immediately and reverses exactly", async () => {
    seedResource();
    const pending = deferred<typeof baseResource>();
    mockUpdateResource.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useUpdateResource(), { wrapper });

    act(() => {
      result.current.mutate({ id: baseResource.id, input: { status: "completed" } });
    });

    await waitFor(() => expect(resourceListCache()[0].status).toBe("completed"));
    expect(areaResources()[0].status).toBe("completed");

    await act(async () => {
      pending.resolve({ ...baseResource, status: "completed" });
      await pending.promise;
    });

    mockUpdateResource.mockResolvedValueOnce({ ...baseResource, status: "inbox" });
    await act(async () => {
      await result.current.mutateAsync({ id: baseResource.id, input: { status: "inbox" } });
    });

    expect(resourceListCache()[0].status).toBe("inbox");
    expect(areaResources()[0].status).toBe("inbox");
  });

  it("rolls back on a rejected save", async () => {
    seedResource();
    mockUpdateResource.mockRejectedValueOnce(new Error("resource save failed"));

    const { result } = renderHook(() => useUpdateResource(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: baseResource.id, input: { status: "completed" } }),
      ).rejects.toThrow("resource save failed");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(resourceListCache()[0].status).toBe("inbox");
    expect(areaResources()[0].status).toBe("inbox");
  });
});
