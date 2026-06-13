// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const fromMock = vi.fn();
const createClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

import { useGoalProjectIdsMap } from "@/lib/hooks/use-goal-project-ids-map";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

describe("useGoalProjectIdsMap", () => {
  beforeEach(() => {
    fromMock.mockReset();
    createClientMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("queries the goal_projects table selecting goal_id and project_id", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { result } = renderHook(() => useGoalProjectIdsMap(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(fromMock).toHaveBeenCalledWith("goal_projects");
    const selectArg = fromMock.mock.results[0].value.select.mock.calls[0][0];
    expect(selectArg).toBe("goal_id, project_id");
  });

  it("builds a goalId -> projectId[] map from the queried rows", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { goal_id: "goal-1", project_id: "project-a" },
          { goal_id: "goal-1", project_id: "project-b" },
          { goal_id: "goal-2", project_id: "project-c" },
        ],
        error: null,
      }),
    });

    const { result } = renderHook(() => useGoalProjectIdsMap(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.get("goal-1")).toEqual(["project-a", "project-b"]);
    });

    expect(result.current.get("goal-2")).toEqual(["project-c"]);
    expect(result.current.get("goal-3")).toBeUndefined();
  });

  it("returns an empty map when no rows are returned", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { result } = renderHook(() => useGoalProjectIdsMap(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.size).toBe(0);
    });
  });

  it("treats a null data response as an empty result", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useGoalProjectIdsMap(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.size).toBe(0);
    });
  });
});
