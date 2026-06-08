import { useMemo } from "react";

/**
 * Returns `rawIds` filtered to only those present in `allowed`.
 *
 * Use when a component holds a user-picked list of IDs in state and
 * needs to drop any IDs that a server/query result no longer
 * recognizes. Replaces the `useEffect` + `setState` reconciliation
 * pattern flagged by `react-hooks/set-state-in-effect`.
 *
 * The returned array is referentially stable when neither input
 * changes by reference, so it is safe to pass to memoized children
 * and to use as an effect dependency.
 */
export function useValidIds<T>(
  rawIds: readonly T[],
  allowed: ReadonlySet<T> | readonly T[],
): T[] {
  return useMemo(() => {
    const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
    return rawIds.filter((id) => allowedSet.has(id));
  }, [rawIds, allowed]);
}
