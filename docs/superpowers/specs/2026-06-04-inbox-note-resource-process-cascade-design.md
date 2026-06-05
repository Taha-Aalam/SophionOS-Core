# Inbox NoteProcessForm + ResourceProcessForm — 4D Cross-Field Cascade

**Date:** 2026-06-04
**Scope:** `src/app/(dashboard)/inbox/page.tsx` — `NoteProcessForm` and `ResourceProcessForm`
**Status:** Approved for implementation
**Builds on:** `2026-06-04-inbox-task-process-cascade-design.md` (TaskProcessForm 3D)

## Problem

The inbox `NoteProcessForm` and `ResourceProcessForm` (rendered under their
respective sections, opened by the "Process" dropdown on a row) currently
have **partial filtering**:

- Area↔Goal cascade is in place via `filterProjectDialogGoals` /
  `filterProjectDialogAreas`
- Project and Task fields are **not** filtered by other dimensions
- Already-selected ids are not pruned when a cascade removes them
- The fields shown to the user are *not* consistent with what they can
  actually link to

`TaskProcessForm` (in the same page, in the Tasks section) was just
brought to parity with `TaskDialog` in the prior spec. This spec extends
that work to the note and resource process forms, applying the **4D
cascade** that already powers `ResourceDialog` (the rich-edit modal).

## Goal

Apply the existing 4D cross-field cascade (area ↔ goal ↔ project ↔ task)
to both `NoteProcessForm` and `ResourceProcessForm` on the inbox page,
mirroring the proven `resource-dialog.tsx` pattern. Topic stays
**outside** the cascade (orthogonal to PARA, same as in the dialog).

Non-goals:
- `ProjectProcessForm` is out of scope (it has no project/task field by
  definition; its 2D goal↔area cascade is sufficient).
- No new filter functions. Reuse the proven
  `resource-dialog-filters.ts` exports.
- No backend/service changes. The cascade is purely a UI presentation
  concern.

## Design

### Files Changed

| File | Change |
|---|---|
| `src/app/(dashboard)/inbox/page.tsx` | Widen `taskOptions` shape; build `projectGoalIdsMap` + `taskGoalIdsMap`; import the two extracted forms; remove the inline `NoteProcessForm` and `ResourceProcessForm` definitions |
| `src/components/entities/note-inbox-process-form.tsx` | New — extracted `NoteProcessForm` (exported) with 4D cascade wired |
| `src/components/entities/resource-inbox-process-form.tsx` | New — extracted `ResourceProcessForm` (exported) with 4D cascade wired; Topic field is unfiltered |
| `tests/unit/note-inbox-process-cascade.test.tsx` | New — 6 cascade cases for the note form |
| `tests/unit/resource-inbox-process-cascade.test.tsx` | New — 7 cascade cases (6 + topic orthogonality) for the resource form |

No other files change. `resource-dialog-filters.ts`,
`project-dialog-filters.ts`, and the relevant `useUpdate*` hooks are
reused as-is.

### Data Shape

**`taskOptions` widens** from `{ id, name }` to:
```ts
{
  id: string;
  name: string;
  area_id: string | null;
  linkedAreaIds: string[];
  linkedGoalIds: string[];
  project_id: string | null;
}
```

`projectOptions` was already widened in the prior spec (carry-over).
`goalOptions` already carries `area_id` + `linkedAreaIds`.

### Precomputed Maps (built once at inbox page level)

```ts
const projectGoalIdsMap = useMemo(() => {
  const m = new Map<string, string[]>();
  for (const p of projectOptions) {
    m.set(p.id, p.linkedGoalIds ?? []);
  }
  return m;
}, [projectOptions]);

const taskGoalIdsMap = useMemo(() => {
  const m = new Map<string, string[]>();
  for (const t of taskOptions) {
    m.set(t.id, t.linkedGoalIds ?? []);
  }
  return m;
}, [taskOptions]);
```

These are passed into both forms via props. The forms forward them to
the filter functions.

### Cascade Wiring (in each form)

Four `useMemo` blocks, mirroring `resource-dialog.tsx`:

```ts
const visibleGoals = useMemo(
  () => computeFilteredGoals(
    goalOptions, areaIds, projectId, projectGoalIdsMap, taskGoalIdsMap, taskIds,
  ),
  [goalOptions, areaIds, projectId, projectGoalIdsMap, taskGoalIdsMap, taskIds],
);

const visibleProjects = useMemo(
  () => computeFilteredProjects(
    projectOptions, areaIds, goalIds, projectGoalIdsMap, taskIds,
  ),
  [projectOptions, areaIds, goalIds, projectGoalIdsMap, taskIds],
);

const visibleAreas = useMemo(
  () => computeVisibleAreas(
    areaOptions, selectedProject, goalIds, taskIds,
  ),
  [areaOptions, selectedProject, goalIds, taskIds],
);

const visibleTasks = useMemo(
  () => computeFilteredTasks(
    taskOptions, areaIds, projectId, goalIds, taskGoalIdsMap,
  ),
  [taskOptions, areaIds, projectId, goalIds, taskGoalIdsMap],
);
```

Four pruning `useEffect` blocks, one per dimension, mirroring the
prior `TaskProcessForm` pattern.

### Filter Semantics (reused from `resource-dialog-filters.ts`)

`★ These are the same semantics that already power `ResourceDialog` and
are covered by its existing tests. No new logic.`

- **Areas**: Project areas ∩ Goal areas ∩ Task areas (AND-intersection)
- **Projects**: Area overlap ∩ goalProjectIdsMap ∩ taskProjectIds (AND)
- **Goals**: Area overlap ∩ projectGoalIdsMap ∩ taskGoalIdsMap (AND),
  with the **asymmetric** rule that tasks can pull in indirect goals
  via their project, but goals don't pull in tasks via their projects
  (lines 168-172 of the filter file explain why)
- **Tasks**: Area overlap ∩ exact project_id ∩ goalTaskIdsMap (AND)

### Resource Form Specifics

- **Topic field**: stays unfiltered. Rendered from a separate unfiltered
  `topicOptions` list. The 4D cascade does not touch it.
- `taskOptions` already includes all active tasks (no archive filter
  inconsistency).

### Note Form Specifics

- 4 PARA fields, no Topic. Same 4D cascade as resource form minus the
  topic column.

### Data Flow

```
user picks field
  → useState setter
    → 4 useMemo recompute
      → 4 useEffect prune invalid state
        → React re-renders
```

Identical to `TaskProcessForm` (prior spec). No race because pruning
is gated on length delta.

## Error Handling

- Empty messages reflect cascade state per dropdown
- Pruning effects guard with length check (no setState loops)
- Maps built once via `useMemo` — no per-render rebuild
- 4D filter functions are pure and total (handle empty inputs)

## Testing

### `tests/unit/note-inbox-process-cascade.test.tsx` (6 cases)

1. No selections → all four triggers show "Select…" placeholders
2. One area selected → "1 selected" badge for area; placeholders for
   goal/project/task
3. One goal selected → "1 selected" badge for goal; placeholders for
   area/project/task
4. One project selected → "1 selected" badge for project; placeholders
   for area/goal/task
5. One task selected → "1 selected" badge for task; placeholders for
   area/goal/project
6. Multiple selections across dimensions → "N selected" badges for
   each non-empty dimension

### `tests/unit/resource-inbox-process-cascade.test.tsx` (7 cases)

Cases 1-6 same as note form, plus:

7. **Topic orthogonality**: pick a topic alone → does not prune or
   affect area/goal/project/task placeholders. Pick area/goal/project/task
   → topic still shows "Select topic…" placeholder unaffected.

### Test Strategy

- Render-to-static-markup (matches repo convention; base-ui DropdownMenu
  doesn't open reliably in jsdom)
- Mock `useUpdateNote` / `useUpdateResource` per file
- Pass fixtures for `areaOptions` / `goalOptions` / `projectOptions` /
  `taskOptions` (widened shape) + the 2 precomputed maps
- Trigger label + selected count assertions verify cascade wiring

### Existing Tests to Verify Not Broken

- `inbox-task-process-cascade.test.tsx` (prior spec)
- `status-reroute-on-create.test.ts`
- `status-reroute-on-update.test.ts`

## Rollout

Single PR. No migration, no feature flag. The change is additive to
`taskOptions` shape (other forms ignore the extra fields, same pattern
as the prior `projectOptions` widening).

## Test Surface (Extraction Pattern)

Following the prior spec's decision: both `NoteProcessForm` and
`ResourceProcessForm` are **extracted** to their own files and
**exported**, so they can be unit-tested in isolation. The move is
purely structural — extracted definitions behave identically until
cascade wiring lands.
