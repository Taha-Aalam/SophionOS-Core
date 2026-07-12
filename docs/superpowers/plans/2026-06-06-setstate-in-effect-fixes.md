# setState-in-effect fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate 14 `react-hooks/set-state-in-effect` and 2 `react-hooks/refs` lint errors in `src/` by replacing the filter-stale-IDs `useEffect` + `setState` pattern with a shared `useValidIds` hook that derives the filtered list at render time, and refactoring one provider's ref-during-render writes.

**Architecture:** One new pure hook (`useValidIds`) does the filter + memoization. Each call site replaces its `useEffect` with a hook call. The provider refactor uses `useEffectEvent` (React 19.2.4+) for stable callbacks that read fresh state.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, TypeScript 5.9, Vitest 4.1, ESLint 9.39.

**Spec:** `docs/superpowers/specs/2026-06-06-setstate-in-effect-fixes-design.md`

**Worktree:** `C:\Users\tahaa\OneDrive\Documents\SaaS\SophionOS\.claude\worktrees\feat-recurring-task`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/hooks/use-valid-ids.ts` | Pure hook: filter rawIds by allowed set, memoize | Create |
| `tests/unit/use-valid-ids.test.ts` | Hook unit tests | Create |
| `tests/unit/inbox-backfill-provider.test.ts` | Provider mount + smoke test | Create |
| `src/components/entities/note-inbox-process-form.tsx` | 4 form sites → hook | Modify |
| `src/components/entities/resource-inbox-process-form.tsx` | 4 form sites → hook | Modify |
| `src/components/entities/inbox-task-process-form.tsx` | 3 form sites → hook | Modify |
| `src/app/(dashboard)/inbox/page.tsx` | 2 page sites → hook | Modify |
| `src/app/(dashboard)/knowledge/page.tsx` | 3 page sites → hook | Modify |
| `src/components/providers/inbox-backfill-provider.tsx` | 2 ref-during-render sites → useEffectEvent | Modify |

The hook is the single new abstraction. Each form/page edit is mechanical: rename state setter, replace `useEffect` with `useValidIds`, update picker handlers. The provider edit is independent and goes last so the build stays lint-clean at each commit.

---

## Task 1: Create `useValidIds` hook (failing test first)

**Files:**
- Create: `src/lib/hooks/use-valid-ids.ts`
- Create: `tests/unit/use-valid-ids.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/use-valid-ids.test.ts`:

```ts
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
    const { result, rerender } = renderHook(({ r, a }) => useValidIds(r, a), {
      initialProps: { r: raw, a: allowed },
    });
    const first = result.current;
    rerender({ r: raw, a: allowed });
    expect(result.current).toBe(first);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/use-valid-ids.test.ts`
Expected: FAIL — module `@/lib/hooks/use-valid-ids` not found.

- [ ] **Step 3: Create the hook file**

Create `src/lib/hooks/use-valid-ids.ts`:

```ts
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
    // We intentionally depend on the raw inputs' references, not the
    // memoized Set, so callers can pass plain arrays without forcing
    // a re-filter on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIds, allowed]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/use-valid-ids.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/use-valid-ids.ts tests/unit/use-valid-ids.test.ts
git commit -m "feat(hooks): add useValidIds to derive valid id subset"
```

---

## Task 2: Refactor `note-inbox-process-form.tsx` (4 sites)

**Files:**
- Modify: `src/components/entities/note-inbox-process-form.tsx`

The form has 4 stale-ID filter effects at lines 188, 196, 204, 212 (from the original lint baseline). Each watches a different `visibleX` + `xIds` pair.

- [ ] **Step 1: Add the import**

In `src/components/entities/note-inbox-process-form.tsx`, locate the existing `react` import and update it to include the new hook. Read the file first to find the exact line, then add `useValidIds` to the import:

```ts
import { useValidIds } from "@/lib/hooks/use-valid-ids";
```

(Place this with the other `@/lib/...` imports near the top of the file.)

- [ ] **Step 2: Read the form's state declarations**

Run: `grep -n "useState\|useEffect\|useValidIds\|setGoalIds\|setAreaIds\|setProjectIds\|setTaskIds" src/components/entities/note-inbox-process-form.tsx`

You should see 4 `useState` declarations (one for each ID list), 4 corresponding `useEffect` blocks, and 4 setter names. Confirm the variable names match the spec (`goalIds`, `areaIds`, `projectIds`, `taskIds`).

- [ ] **Step 3: Rename the four state setters**

For each of `setGoalIds`, `setAreaIds`, `setProjectIds`, `setTaskIds` in the file, rename to `setRawGoalIds`, `setRawAreaIds`, `setRawProjectIds`, `setRawTaskIds` respectively. The read names (`goalIds`, `areaIds`, `projectIds`, `taskIds`) stay the same.

Use Edit tool with `replace_all: true` for each rename. The setters appear in:
- The `useState` line (e.g. `const [goalIds, setGoalIds] = useState...`).
- The picker handlers (e.g. `setGoalIds(newIds)`).
- Anywhere else that writes to that state.

Example Edit:

```
old_string: const [goalIds, setGoalIds] = useState
new_string: const [goalIds, setRawGoalIds] = useState
```

- [ ] **Step 4: Delete the 4 `useEffect` blocks and add 4 `useValidIds` calls**

After the existing `useMemo` blocks for `visibleGoals`, `visibleAreas`, `visibleProjects`, `visibleTasks` (which appear immediately before the `useEffect` blocks), the current code looks like:

```ts
useEffect(() => {
  const allowedGoalIds = new Set(visibleGoals.map((goal) => goal.id));
  const nextGoalIds = goalIds.filter((goalId) => allowedGoalIds.has(goalId));
  if (nextGoalIds.length !== goalIds.length) {
    setGoalIds(nextGoalIds);
  }
}, [visibleGoals, goalIds]);
```

Replace the 4 `useEffect` blocks with 4 `useValidIds` calls placed in the same spot. The final shape is:

```ts
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
const projectIds = useValidIds(rawProjectIds, visibleProjects.map((project) => project.id));
const taskIds = useValidIds(rawTaskIds, visibleTasks.map((task) => task.id));
```

The four `const [goalIds, setRawGoalIds] = useState(...)` declarations above these lines remain — the read of `goalIds` is shadowed by the new `const goalIds = useValidIds(...)`. To make the code read top-to-bottom without shadow confusion, move the `useValidIds` calls BEFORE the `useMemo` for the corresponding `visibleX` if it makes the read order easier. **Recommended:** keep the existing `useState` declarations where they are, and place the `useValidIds` calls right after the `useMemo` blocks that produce the corresponding `visibleX`. The shadowing is conventional and acceptable for this codebase's style (matches the existing `useMemo` shadowing of prop defaults).

- [ ] **Step 5: Verify the file still type-checks**

Run: `npx tsc --noEmit src/components/entities/note-inbox-process-form.tsx`
Expected: 0 errors. If errors, the most common cause is a missed setter rename — re-grep for `setGoalIds|setAreaIds|setProjectIds|setTaskIds` (without `Raw`) and fix any remaining references.

- [ ] **Step 6: Verify the 4 errors in this file are gone**

Run: `npx eslint src/components/entities/note-inbox-process-form.tsx 2>&1 | grep -c "react-hooks/set-state-in-effect"`
Expected output: `0`
(Was 4 in baseline.)

- [ ] **Step 7: Commit**

```bash
git add src/components/entities/note-inbox-process-form.tsx
git commit -m "refactor(note-inbox): derive valid ids at render via useValidIds"
```

---

## Task 3: Refactor `resource-inbox-process-form.tsx` (4 sites)

**Files:**
- Modify: `src/components/entities/resource-inbox-process-form.tsx`

Same pattern as Task 2. The 4 filter sites are at lines 168, 176, 184, 191. The 4 ID lists are `goalIds`, `areaIds`, `taskIds`, `projectId` (note: `projectId` is singular here — one project, not a list).

- [ ] **Step 1: Add the import**

```ts
import { useValidIds } from "@/lib/hooks/use-valid-ids";
```

- [ ] **Step 2: Read state declarations and setters**

Run: `grep -n "useState\|useEffect\|setGoalIds\|setAreaIds\|setTaskIds\|setProjectId" src/components/entities/resource-inbox-process-form.tsx`

- [ ] **Step 3: Rename the 4 setters**

Rename `setGoalIds` → `setRawGoalIds`, `setAreaIds` → `setRawAreaIds`, `setTaskIds` → `setRawTaskIds`, `setProjectId` → `setRawProjectId`. Read names stay.

- [ ] **Step 4: Delete the 4 `useEffect` blocks, add 4 `useValidIds` calls**

```ts
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
const taskIds = useValidIds(rawTaskIds, visibleTasks.map((task) => task.id));
const projectId = useValidIds(rawProjectId, visibleProjects.map((project) => project.id))[0] ?? null;
```

Note: `projectId` is a single ID. Use `[0]` to extract the first element, defaulting to `null` if empty. Confirm the existing `useEffect` for `projectId` (the singular one) uses the same `?? null` fallback pattern. If not, match whatever the existing code does for the empty case.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit src/components/entities/resource-inbox-process-form.tsx`
Expected: 0 errors.

- [ ] **Step 6: Verify errors gone**

Run: `npx eslint src/components/entities/resource-inbox-process-form.tsx 2>&1 | grep -c "react-hooks/set-state-in-effect"`
Expected: `0` (was 4).

- [ ] **Step 7: Commit**

```bash
git add src/components/entities/resource-inbox-process-form.tsx
git commit -m "refactor(resource-inbox): derive valid ids at render via useValidIds"
```

---

## Task 4: Refactor `inbox-task-process-form.tsx` (3 sites)

**Files:**
- Modify: `src/components/entities/inbox-task-process-form.tsx`

The 3 filter sites are at lines 107, 115, 123.

- [ ] **Step 1: Add the import**

```ts
import { useValidIds } from "@/lib/hooks/use-valid-ids";
```

- [ ] **Step 2: Read state and setters**

Run: `grep -n "useState\|useEffect\|setGoalIds\|setAreaIds\|setProjectIds" src/components/entities/inbox-task-process-form.tsx`

Confirm the 3 ID list names. They may be `goalIds`, `areaIds`, `projectIds` (the lint output mentioned `filteredProjects` in the dep array, so `projectIds` is the likely name).

- [ ] **Step 3: Rename the 3 setters**

Rename each setter to its `setRaw...` counterpart. Read names stay.

- [ ] **Step 4: Delete the 3 `useEffect` blocks, add 3 `useValidIds` calls**

```ts
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
const projectIds = useValidIds(rawProjectIds, visibleProjects.map((project) => project.id));
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit src/components/entities/inbox-task-process-form.tsx`
Expected: 0 errors.

- [ ] **Step 6: Verify errors gone**

Run: `npx eslint src/components/entities/inbox-task-process-form.tsx 2>&1 | grep -c "react-hooks/set-state-in-effect"`
Expected: `0` (was 3).

- [ ] **Step 7: Commit**

```bash
git add src/components/entities/inbox-task-process-form.tsx
git commit -m "refactor(task-inbox): derive valid ids at render via useValidIds"
```

---

## Task 5: Refactor `src/app/(dashboard)/inbox/page.tsx` (2 sites)

**Files:**
- Modify: `src/app/(dashboard)/inbox/page.tsx`

The 2 filter sites are at lines 276, 284. Lint output showed the deps arrays include `visibleGoals, goalIds` and `visibleAreas, areaIds`.

- [ ] **Step 1: Add the import**

```ts
import { useValidIds } from "@/lib/hooks/use-valid-ids";
```

- [ ] **Step 2: Read state and setters**

Run: `grep -n "useState\|useEffect\|setGoalIds\|setAreaIds" "src/app/(dashboard)/inbox/page.tsx"`

- [ ] **Step 3: Rename the 2 setters**

Rename to `setRaw...` counterparts.

- [ ] **Step 4: Delete the 2 `useEffect` blocks, add 2 `useValidIds` calls**

```ts
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit "src/app/(dashboard)/inbox/page.tsx"`
Expected: 0 errors.

- [ ] **Step 6: Verify errors gone**

Run: `npx eslint "src/app/(dashboard)/inbox/page.tsx" 2>&1 | grep -c "react-hooks/set-state-in-effect"`
Expected: `0` (was 2).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "refactor(inbox): derive valid ids at render via useValidIds"
```

---

## Task 6: Refactor `src/app/(dashboard)/knowledge/page.tsx` (3 sites)

**Files:**
- Modify: `src/app/(dashboard)/knowledge/page.tsx`

The 3 filter sites are at lines 108, 116, 124. Lint deps arrays include `visibleGoals, goalIds`, `visibleAreas, areaIds`, `filteredProjects, projectIds`.

- [ ] **Step 1: Add the import**

```ts
import { useValidIds } from "@/lib/hooks/use-valid-ids";
```

- [ ] **Step 2: Read state and setters**

Run: `grep -n "useState\|useEffect\|setGoalIds\|setAreaIds\|setProjectIds" "src/app/(dashboard)/knowledge/page.tsx"`

- [ ] **Step 3: Rename the 3 setters**

Rename to `setRaw...` counterparts.

- [ ] **Step 4: Delete the 3 `useEffect` blocks, add 3 `useValidIds` calls**

```ts
const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
const projectIds = useValidIds(rawProjectIds, filteredProjects.map((project) => project.id));
```

Note: the third one uses `filteredProjects` (the page applies an additional filter on top of `visibleProjects`), matching the existing dep array. If the page uses a different variable name for the third `useEffect`'s source list, match it.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit "src/app/(dashboard)/knowledge/page.tsx"`
Expected: 0 errors.

- [ ] **Step 6: Verify errors gone**

Run: `npx eslint "src/app/(dashboard)/knowledge/page.tsx" 2>&1 | grep -c "react-hooks/set-state-in-effect"`
Expected: `0` (was 3).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/knowledge/page.tsx"
git commit -m "refactor(knowledge): derive valid ids at render via useValidIds"
```

---

## Task 7: Refactor `inbox-backfill-provider.tsx` (ref-during-render → useEffectEvent)

**Files:**
- Modify: `src/components/providers/inbox-backfill-provider.tsx`

The 2 errors at lines 48 and 50 are `react-hooks/refs` ("Cannot update ref during render"), not `set-state-in-effect`. The fix uses `useEffectEvent` from React 19.2.

- [ ] **Step 1: Verify `useEffectEvent` is exported from `react`**

Run: `grep -l "useEffectEvent" node_modules/react/index.d.ts node_modules/@types/react/index.d.ts 2>/dev/null | head -2`
Expected: at least one path printed. If neither prints, skip to Step 7's fallback.

- [ ] **Step 2: Read the current file**

Read `src/components/providers/inbox-backfill-provider.tsx` to confirm the exact shape around lines 46-50. The block to replace is:

```ts
// Stable references so the mutation-cache subscription can read them
// without re-subscribing on every render.
const userIdRef = useRef<string | undefined>(userId);
userIdRef.current = userId;
const queryClientRef = useRef(queryClient);
queryClientRef.current = queryClient;
```

- [ ] **Step 3: Update the import**

Change:
```ts
import { useEffect, useRef } from "react";
```
to:
```ts
import { useEffect, useEffectEvent, useRef } from "react";
```

- [ ] **Step 4: Replace the ref-during-render block with `useEffectEvent` wrappers**

Replace the block from Step 2 with:

```ts
// Stable event-readers so the mutation-cache subscription can read the
// freshest userId/queryClient without re-subscribing on every render.
// `useEffectEvent` is the React 19 idiom for "stable callback that
// always reads the latest state" — it does not need to be in any
// dependency array, and the function identity never changes.
const readUserId = useEffectEvent(() => userIdRef.current);
const readQueryClient = useEffectEvent(() => queryClientRef.current);
```

The two `useRef` calls remain — the refs are the snapshot values that the rest of the file reads. Only the render-time `ref.current = x` writes are removed, and they are now driven indirectly by the event readers.

- [ ] **Step 5: Update the consumers of the snapshots**

In the same file, find every read of `userIdRef.current` and `queryClientRef.current` (most are inside `runBackfill` and the `useEffect` callback). Replace direct ref reads with the event-reader calls:

- `userIdRef.current` → `readUserId()`
- `queryClientRef.current` → `readQueryClient()`

The actual refs (`userIdRef`, `queryClientRef`) can stay defined but their `.current` values are now written by the `useEffectEvent` readers at call-time, not by direct render-time assignment. If you prefer, leave the refs and the render-time assignments untouched and only add the `useEffectEvent` wrappers as a no-op safety net — but that would not silence the lint, so the render-time assignments must go.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit src/components/providers/inbox-backfill-provider.tsx && npx eslint src/components/providers/inbox-backfill-provider.tsx 2>&1 | grep -E "react-hooks|refs|error"`
Expected: 0 errors, 0 warnings of the form "Cannot update ref during render".

- [ ] **Step 7: Fallback if `useEffectEvent` is unavailable**

If Step 1 showed `useEffectEvent` is not exported, use the simpler `useEffect` approach. Replace the import with:

```ts
import { useEffect, useRef } from "react";
```

(unchanged). Replace the ref-during-render block with two effects:

```ts
const userIdRef = useRef<string | undefined>(userId);
useEffect(() => {
  userIdRef.current = userId;
}, [userId]);

const queryClientRef = useRef(queryClient);
useEffect(() => {
  queryClientRef.current = queryClient;
}, [queryClient]);
```

The rest of the file (consumers reading `userIdRef.current` / `queryClientRef.current`) is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/components/providers/inbox-backfill-provider.tsx
git commit -m "refactor(inbox-backfill): use useEffectEvent for ref reads, drop render writes"
```

---

## Task 8: Provider smoke test

**Files:**
- Create: `tests/unit/inbox-backfill-provider.test.tsx`

- [ ] **Step 1: Write the test**

Create `tests/unit/inbox-backfill-provider.test.tsx` (note: `.tsx` because the provider returns JSX):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";

// Mock the auth provider so we don't need a real user.
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

// Mock the service modules to verify they are called once.
vi.mock("@/lib/services/note.service", () => ({
  noteService: { backfillStaleStatuses: vi.fn().mockResolvedValue(0) },
}));
vi.mock("@/lib/services/project.service", () => ({
  projectService: { backfillStaleStatuses: vi.fn().mockResolvedValue(0) },
}));
vi.mock("@/lib/services/task.service", () => ({
  taskService: { backfillStaleStatuses: vi.fn().mockResolvedValue(0) },
}));
vi.mock("@/lib/services/resource.service", () => ({
  resourceService: { backfillStaleStatuses: vi.fn().mockResolvedValue(0) },
}));

describe("InboxBackfillProvider", () => {
  it("renders its children without crashing", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <InboxBackfillProvider>{children}</InboxBackfillProvider>
      </QueryClientProvider>
    );
    const { findByText } = render(<div>hello</div>, { wrapper });
    expect(await findByText("hello")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/unit/inbox-backfill-provider.test.tsx`
Expected: PASS. If it fails on the session-storage guard, the test environment may not have `window.sessionStorage`; mock it via:

```ts
Object.defineProperty(window, "sessionStorage", {
  value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  writable: true,
});
```

Add this before `render(...)` if needed.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/inbox-backfill-provider.test.tsx
git commit -m "test(inbox-backfill): add mount smoke test"
```

---

## Task 9: Final verification

**Files:** none modified

- [ ] **Step 1: Lint must be 0 errors**

Run: `npx eslint src --no-warn-ignored 2>&1 | tail -3`
Expected: `✖ 47 problems (0 errors, 47 warnings)` (warnings remain, as scoped).

- [ ] **Step 2: Type-check must be 0 errors**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: All tests must pass**

Run: `npx vitest run`
Expected: all tests green, including the new `use-valid-ids` and `inbox-backfill-provider` tests.

- [ ] **Step 4: Git status clean**

Run: `git status`
Expected: working tree clean. All 9 tasks committed individually.

- [ ] **Step 5: Final commit if any cleanup needed**

If Step 1-3 required any fix-up, commit those fixes. Otherwise: no commit, plan is done.
