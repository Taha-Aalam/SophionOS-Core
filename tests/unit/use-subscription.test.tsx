// @vitest-environment jsdom

// Regression: the topbar cohort pill vanished and reappeared across client
// navigations. useSubscription used to refetch from scratch on every mount and
// map a failed fetch to null, so any blip in GET /api/v1/user/subscription
// (itself fail-closed to cohortMember:false) unmounted the badge until the
// next successful fetch. The hook now shares one session-cached value, and a
// failed fetch never wipes a previously known value.
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const json = (cohortMember: boolean) =>
  ({
    ok: true,
    json: async () => ({ data: { tier: "pro", isPaid: true, cohortMember } }),
  }) as Response;

async function freshHook() {
  vi.resetModules();
  return (await import("@/lib/hooks/use-subscription")).useSubscription;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useSubscription session cache", () => {

  it("keeps the last known value when a later mount's refetch fails", async () => {
    const useSubscription = await freshHook();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json(true))
        .mockRejectedValueOnce(new Error("network down")),
    );

    const first = renderHook(() => useSubscription());
    await act(async () => {});
    expect(first.result.current.data?.cohortMember).toBe(true);

    // TTL expires, then a navigation remounts the hook and the refetch fails.
    vi.advanceTimersByTime(61_000);
    cleanup();
    const second = renderHook(() => useSubscription());
    await act(async () => {});
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    // The failure must not wipe the previously displayed value.
    expect(second.result.current.data?.cohortMember).toBe(true);
  });

  it("shares one in-flight request across concurrent mounts", async () => {
    const useSubscription = await freshHook();
    const pending = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal("fetch", fetchMock);

    const a = renderHook(() => useSubscription());
    const b = renderHook(() => useSubscription());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(json(true)));
    await waitFor(() =>
      expect(a.result.current.data?.cohortMember).toBe(true),
    );
    expect(b.result.current.data?.cohortMember).toBe(true);
  });

  it("serves cached values within the TTL and refetches after expiry", async () => {
    const useSubscription = await freshHook();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json(true))
        .mockResolvedValueOnce(json(false)),
    );

    const first = renderHook(() => useSubscription());
    await act(async () => {});
    expect(first.result.current.data?.cohortMember).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // Remount inside the TTL: cached value, no request.
    cleanup();
    const second = renderHook(() => useSubscription());
    expect(second.result.current.data?.cohortMember).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // After the TTL (matches the server-side 60s summary cache): refetch.
    vi.advanceTimersByTime(61_000);
    cleanup();
    const third = renderHook(() => useSubscription());
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    await act(async () => {});
    expect(third.result.current.data?.cohortMember).toBe(false);
  });

  it("fails closed to null when the first fetch fails and nothing is known", async () => {
    const useSubscription = await freshHook();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    const { result } = renderHook(() => useSubscription());
    await act(async () => {});
    expect(result.current.data).toBeNull();
  });
});
