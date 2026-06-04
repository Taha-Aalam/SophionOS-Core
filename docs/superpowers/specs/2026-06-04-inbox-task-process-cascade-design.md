# Inbox TaskProcessForm — 3D Cross-Field Cascade

**Date:** 2026-06-04
**Scope:** `src/app/(dashboard)/inbox/page.tsx` — `TaskProcessForm` only
**Status:** Approved for implementation

## Problem

The inbox `TaskProcessForm` (rendered under the Tasks section, opened by the
"Process" dropdown on a task row) currently has **partial filtering** on its
area, goal, and project fields. The area↔goal cascade is in place via
`filterProjectDialogGoals` / `filterProjectDialogAreas`, but:

- The project field shows **every non-archived project** regardless of which
  area or goal the user has picked.
- The goal list does **not** narrow when a project is picked.
- The area list does **not** narrow when a project is picked.
- Already-selected ids are not pruned when a cascade removes them.

This is inconsistent with `TaskDialog` (the create/edit modal) which already
applies the full 3D cascade via `task-dialog-filters.ts`. Users who pick a
goal in the inbox can end up with a project that has no relationship to it,
and vice versa.

## Goal

Bring the inbox `TaskProcessForm` to parity with `TaskDialog` by applying the
existing 3D cross-field cascade (project ↔ area ↔ goal) and the
already-selected-id pruning pattern.

Non-goals:
- `ProjectProcessForm`, `NoteProcessForm`, `ResourceProcessForm` are
  **out of scope** for this change. (Project has no project field by
  definition; Note/Resource use the 2D cascade intentionally.)
- No new filter functions. Reuse the proven `task-dialog-filters` exports.
- No backend/service changes. The cascade is purely a UI presentation concern.

## Design

### Files Changed

| File | Change |
|---|---|
| `src/app/(dashboard)/inbox/page.tsx` | Widen `projectOptions` shape; import `TaskProcessForm` from new file |
| `src/components/entities/inbox-task-process-form.tsx` | New — extract `TaskProcessForm` (with 3D cascade) so it can be unit-tested |
| `tests/unit/inbox-task-process-cascade.test.tsx` | New — covers the 6 cascade cases against the extracted form |

No other files change. `task-dialog-filters.ts`, `project-dialog-filters.ts`,
and `useDerivedStatus` are reused as-is. The original
`TaskProcessForm` definition moves verbatim to the new file (minus
the now-unused `filterProjectDialogGoals` / `filterProjectDialogAreas`
imports).

### Data Shape

`projectOptions` widens from `{ id, name }` to:
```ts
{
  id: string;
  name: string;
  area_id: string | null;
  linkedAreaIds: string[];
  linkedGoalIds: string[];
}
```

`goalOptions` already carries `area_id` + `linkedAreaIds` (lines 1691–1703 of
`inbox/page.tsx`) — no change needed.

`areaOptions` is the same shape (`{ id, name, icon }`) — no change needed.

### Cascade Wiring (in `TaskProcessForm`)

Replace the two existing `useMemo` blocks (lines 495–502) with three:

```ts
const projectById = useMemo(
  () => new Map(projectOptions.map((p) => [p.id, p])),
  [projectOptions],
);

const visibleGoals = useMemo(
  () => computeVisibleGoalsForProjects(
    goalOptions, projectIds, areaIds, projectById,
  ),
  [goalOptions, projectIds, areaIds, projectById],
);

const visibleAreas = useMemo(
  () => computeVisibleAreasForProjects(
    areaOptions, goalIds, projectIds, projectById, goalOptions,
  ),
  [areaOptions, goalOptions, goalIds, projectIds, projectById],
);

const filteredProjects = useMemo(
  () => computeFilteredProjects(projectOptions, goalIds, areaIds),
  [projectOptions, goalIds, areaIds],
);
```

Add a third pruning `useEffect` (after the existing area-prune effect):

```ts
useEffect(() => {
  const allowedProjectIds = new Set(filteredProjects.map((p) => p.id));
  const nextProjectIds = projectIds.filter((id) => allowedProjectIds.has(id));
  if (nextProjectIds.length !== projectIds.length) {
    setProjectIds(nextProjectIds);
  }
}, [filteredProjects, projectIds]);
```

### JSX Wiring

| Location | Change |
|---|---|
| Project selector `candidates` (line 641) | `projectOptions` → `filteredProjects` |
| Project selector `emptyMessage` (line 645) | Show "No projects match selected context." when constraints active |
| Area selector `candidates` (line 546) | `areaOptions` → `visibleAreas` |
| Goal selector `candidates` (line 591) | `goalOptions` → `visibleGoals` |

### Filter Semantics (reused from `task-dialog-filters.ts`)

`★ These are the same semantics that already power `TaskDialog` and are
covered by `status-reroute-on-create.test.ts` and
`status-reroute-on-update.test.ts`. No new logic.`

- **Projects**: AND of goal-link + area-link constraints. If both empty → all.
- **Goals (multi-project)**: Union of `linkedGoalIds` across selected projects,
  intersected with goals matching any selected area. A project with empty
  `linkedGoalIds` imposes no goal constraint.
- **Areas (multi-project)**: Union of project areas intersected with union of
  goal areas. Empty result → empty list.

### Data Flow

```
user picks field
  → useState setter
    → useMemo recomputes (visibleGoals / visibleAreas / filteredProjects)
      → useEffect prunes state if cascade removed a selected id
        → React re-renders
```

No race: pruning effects only fire when their `useMemo` dependency changes
(deep equality of `useState` arrays, which `useMemo` re-derives on each
relevant input change).

## Error Handling

- Empty states handled via `emptyMessage` props on `CompactDropdownMultiSelect`
- Pruning effects guard with length check to prevent setState loops
- No new error paths — filter functions are pure and total

## Testing

New file: `tests/unit/inbox-task-process-cascade.test.tsx`

Test cases (6 minimum):

1. **No selections** → all three lists show the full set passed via the
   `areaOptions` / `goalOptions` / `projectOptions` fixtures (i.e. the
   filter functions' no-op early return)
2. **Pick area** → project list shrinks to projects whose `area_id` or
   `linkedAreaIds` includes the selected area
3. **Pick goal** → area list shrinks to areas in the goal's link set
4. **Pick project** → goal list shrinks to project's `linkedGoalIds`; area
   list shrinks to project's area chain
5. **Prune projects** → using a fixture where a project exists whose
   `linkedGoalIds` does not include the currently selected goal: pick that
   project; the previously selected goal is deselected by the prune effect
6. **Multi-project union** → pick two unrelated projects; goal list is the
   union of their `linkedGoalIds` (matches task-dialog semantics)

Mock strategy:
- Mock `useUpdateTask` to capture payload
- Pass fixtures for `areaOptions`, `goalOptions`, `projectOptions` (now with
  `linkedGoalIds` + `linkedAreaIds`)
- Render with `@testing-library/react`
- Use `userEvent` to interact

Existing tests to verify still pass:
- `status-reroute-on-create.test.ts`
- `status-reroute-on-update.test.ts`

## Rollout

Single PR. No migration, no feature flag. The change is additive to
`projectOptions` shape (other forms ignore the extra fields).

## Test Surface (revised)

`TaskProcessForm` is extracted from `inbox/page.tsx` into
`src/components/entities/inbox-task-process-form.tsx` and **exported**.
This is the only structural change beyond the spec's earlier form. The
extracted component takes the same props it had in `inbox/page.tsx` and
behaves identically — the move is purely for unit-test ergonomics.
