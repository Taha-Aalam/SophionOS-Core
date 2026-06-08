# Fix `set-state-in-effect` and `refs-during-render` lint errors

**Date:** 2026-06-06
**Scope:** 14 lint errors across 6 files in `src/`
**Approach:** One shared hook + render-time derivation, plus one ref-to-effectEvent refactor

## Problem

`npx eslint src` reports 15 errors (14 `react-hooks/set-state-in-effect` + 1 `react-hooks/refs`-related) and 47 warnings. The user has chosen to fix the errors only; warnings are out of scope for this spec.

The errors come from two distinct anti-patterns that React 19's new lint rules flag:

1. **`set-state-in-effect` (12 sites):** Components hold an "intent" list of IDs in state, then run a `useEffect` that filters out IDs no longer present in a query result, calling `setState` to reconcile. The reconciliation is derivable at render time, so the effect is wasted work that also causes a cascading render.
2. **`refs-during-render` (2 sites in 1 file):** A provider assigns to `ref.current` directly in the render body to keep a ref in sync with a prop. This works, but React 19 prefers `useEffectEvent` (stable callback reading fresh state) for the same use case.

## Goals

- Eliminate all 14 errors with no behavior regression in user-facing flows.
- Do not duplicate the filter-stale-IDs logic 12 times.
- Keep forms that save on submit (note/resource/task inbox process forms) producing identical save payloads.
- Pass the existing form tests unchanged.
- Stay within the 0/52 warning budget the user is choosing to defer (do not regress).

## Non-goals

- Fix the 36 unused-vars warnings.
- Fix the 4 `no-explicit-any` warnings in `src/`.
- Fix the 3 `incompatible-library` warnings (separate dep-upgrade task).
- Refactor the provider beyond what is required to silence the lint rule.
- Add new features, change UX, or alter save behavior.

## Approach

### 1. New shared hook: `useValidIds`

**File:** `src/lib/hooks/use-valid-ids.ts`

```ts
import { useMemo, type DependencyList } from "react";

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
    const allowedSet =
      allowed instanceof Set ? allowed : new Set(allowed);
    return rawIds.filter((id) => allowedSet.has(id));
    // We intentionally depend on the raw inputs' references, not the
    // memoized Set, so callers can pass plain arrays without forcing
    // a re-filter on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIds, allowed]);
}
```

**Why this shape:**
- Accepts both `Set` and array for `allowed` — most call sites will pass `visibleX.map((x) => x.id)`, and we do not want to force every caller to wrap in `new Set(...)`.
- Memoizes on input references. Same raw IDs + same allowed array → same output array → safe as a dependency.
- Pure function of inputs. No state. No effect. Lint-clean by construction.

### 2. Replace 12 `useEffect` filter sites

For each of the 12 sites, the diff is mechanical:

**Before:**
```ts
const [goalIds, setGoalIds] = useState<string[]>([]);
const visibleGoals = useMemo(() => /* ... */, [/* ... */]);

useEffect(() => {
  const allowedGoalIds = new Set(visibleGoals.map((g) => g.id));
  const nextGoalIds = goalIds.filter((id) => allowedGoalIds.has(id));
  if (nextGoalIds.length !== goalIds.length) {
    setGoalIds(nextGoalIds);
  }
}, [visibleGoals, goalIds]);
```

**After:**
```ts
const [rawGoalIds, setRawGoalIds] = useState<string[]>([]);
const visibleGoals = useMemo(() => /* ... */, [/* ... */]);
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((g) => g.id));
```

Then rename all in-component uses of `goalIds` (the state setter `setGoalIds` becomes `setRawGoalIds`; the read `goalIds` stays the same because the derived value keeps the name).

**Important:** The user-pick handlers currently call `setGoalIds(newIds)`. They must be updated to call `setRawGoalIds(newIds)`. The submit handler reads `goalIds` and is unchanged.

**Files modified (5):**
- `src/components/entities/note-inbox-process-form.tsx` — 4 sites (goalIds, areaIds, projectIds, taskIds)
- `src/components/entities/resource-inbox-process-form.tsx` — 4 sites (goalIds, areaIds, taskIds, projectId)
- `src/components/entities/inbox-task-process-form.tsx` — 3 sites (visibleIds in 3 forms)
- `src/app/(dashboard)/inbox/page.tsx` — 2 sites (goalIds, areaIds)
- `src/app/(dashboard)/knowledge/page.tsx` — 3 sites (goalIds, areaIds, projectIds)

Note: the original count was 14+1, and this group accounts for 12 of the 14. The remaining 2 are the `inbox-backfill-provider` `refs-during-render` errors, handled below.

### 3. `inbox-backfill-provider` ref-during-render fix

**File:** `src/components/providers/inbox-backfill-provider.tsx`

**Before (lines 46-50):**
```ts
// Stable references so the mutation-cache subscription can read them
// without re-subscribing on every render.
const userIdRef = useRef<string | undefined>(userId);
userIdRef.current = userId;
const queryClientRef = useRef(queryClient);
queryClientRef.current = queryClient;
```

**After:**
```ts
// Stable references so the mutation-cache subscription can read them
// without re-subscribing on every render. `useEffectEvent` is the
// React 19 idiom for "stable callback that reads fresh state" — it
// always sees the latest values of `userId` and `queryClient`
// without re-subscribing.
const readUserId = useEffectEvent(() => userIdRef.current);
const readQueryClient = useEffectEvent(() => queryClientRef.current);
```

The two `userIdRef.current = userId;` / `queryClientRef.current = queryClient;` assignments in render are removed. The two refs themselves stay (they are still the snapshot reads used inside `runBackfill`). The `useEffectEvent` wrappers are then called in the `useEffect` body wherever a fresh read is needed (e.g. `const uid = readUserId();`).

**Why `useEffectEvent` and not a plain `useEffect`?**
A plain `useEffect(() => { ref.current = x; }, [x])` re-fires on every `x` change but does not help if the consumer wants the *current* value mid-event. `useEffectEvent` produces a stable function that, when called, returns the latest value. That is exactly the property the mutation-cache subscription needs: the unsubscribe/reshubscribe does not change, but the read inside the callback is always fresh.

If `useEffectEvent` is not available in the project's React version, fall back to keeping the refs and the two `useEffect` assignments:
```ts
useEffect(() => { userIdRef.current = userId; }, [userId]);
useEffect(() => { queryClientRef.current = queryClient; }, [queryClient]);
```

**Verification step during implementation:** confirm `useEffectEvent` is exported from `react` in `node_modules/react/index.d.ts`. If present, use it. If absent (unlikely on 19.2.4), fall back to the `useEffect` approach.

### 4. Tests

**New:** `tests/unit/use-valid-ids.test.ts`
- Returns empty array for empty input.
- Returns full input when all IDs are allowed.
- Drops IDs not in the allowed set.
- Preserves order from `rawIds`.
- Same input references → same output reference (memoization).
- Accepts both `Set` and array for `allowed`.

**Existing:** all form tests in `tests/unit/*inbox-process*` and any tests touching `inbox/page.tsx` or `knowledge/page.tsx` ID-filtering behavior must pass unchanged. They test observable behavior (form submission payload, displayed selected IDs), not the `useEffect` implementation.

**Provider:** add a small smoke test for `InboxBackfillProvider` mounting + running the on-mount backfill once. Not strictly required to silence the lint, but guards against regressing the refactor.

## Behavior preservation

| Scenario | Before | After |
|---|---|---|
| User picks IDs, all still in query result | IDs saved | IDs saved (same) |
| User picks IDs, one archived between pick and save | `useEffect` strips it on next render, then save sends valid set | Render-time derivation strips it on next render, save sends valid set |
| User opens form, query result is empty | `useEffect` runs, strips everything, save sends `[]` | Render-time derivation returns `[]`, save sends `[]` |
| User picks ID, then query list refreshes (no removal) | `useEffect` runs, filter is no-op, no setState | Render-time derivation returns same IDs, no setState |
| Race: query updates twice in a single tick | Two effect runs, two cascading renders | One render, derivation is pure, no races |
| Frame where stale IDs were visible | ~1 frame | 0 frames |

User-observable behavior is identical. The fix removes a 1-frame window where stale IDs were briefly shown, and a cascading render on every query update.

## Risk

**Low.** The transformation is mechanical and bounded:
- One new file with a pure hook.
- 5 form/page files modified with identical rename patterns.
- 1 provider file with a 4-line refactor.
- Existing tests act as the regression net.

**Rollback:** revert the commit. The hook is additive (does not change any public API), and the form/provider edits are 1:1 swaps with no schema or API change.

## Out of scope (deferred)

- 36 unused-vars warnings — separate task. Lint is currently at 47 warnings + 15 errors = 62 problems; this spec takes errors to 0, warnings stay at 47.
- 4 `no-explicit-any` in `src/` — separate task.
- 3 `incompatible-library` in `task-dialog`/`area-dialog`/`contact-dialog` — separate task. Likely needs a dependency upgrade (e.g. `react-hook-form` 7.72.1 → 8.x for React 19 compiler manifest) or a per-line `useEffectEvent` adoption.

## Success criteria

- `npx eslint src` reports 0 errors. Warnings remain at 47 (or fewer if the form edits incidentally fix some unused-vars in passing).
- `npx vitest run` passes all existing tests.
- `npx tsc --noEmit` reports no new type errors.
- Manual smoke: open each modified form (note, resource, task inbox process), pick IDs, change them, save. Confirm save payload matches pre-refactor behavior.
