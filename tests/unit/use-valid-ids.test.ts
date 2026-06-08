// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useValidIds } from "@/lib/hooks/use-valid-ids";

describe("useValidIds", () => {
  it("returns an empty array when rawIds is empty", () => {
    const { result } = renderHook(() => useValidIds<string>([], ["a", "b"]));
    expect(result.current).toEqual([]);
  });

  it("returns all ids when every rawId is allowed", () => {
    const { result } = renderHook(() => useValidIds(["a", "b"], ["a", "b", "c"]));
    expect(result.current).toEqual(["a", "b"]);
  });

  it("drops ids that are not in the allowed set", () => {
    const { result } = renderHook(() => useValidIds(["a", "x", "b", "y"], ["a", "b"]));
    expect(result.current).toEqual(["a", "b"]);
  });

  it("preserves order from rawIds", () => {
    const { result } = renderHook(() => useValidIds(["b", "a"], ["a", "b"]));
    expect(result.current).toEqual(["b", "a"]);
  });

  it("accepts a Set for allowed", () => {
    const allowed = new Set(["a", "b"]);
    const { result } = renderHook(() => useValidIds(["a", "x", "b"], allowed));
    expect(result.current).toEqual(["a", "b"]);
  });

  it("returns a referentially stable output when inputs do not change", () => {
    const raw = ["a", "b"];
    const allowed = ["a", "b", "c"];
    const { result, rerender } = renderHook(
      ({ r, a }: { r: string[]; a: string[] }) => useValidIds(r, a),
      { initialProps: { r: raw, a: allowed } },
    );
    const first = result.current;
    rerender({ r: raw, a: allowed });
    expect(result.current).toBe(first);
  });
});
