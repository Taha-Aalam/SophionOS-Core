# Notes Metadata Panel — Bug Fixes & Enhancements

**Date:** 2026-05-08  
**Status:** Approved

---

## Problem Summary

The Note metadata panel (shared between `/notes/new` and `/notes/[id]`) has four categories of bugs:

1. **Scroll** — Area dropdown (and Tasks dropdown) cannot scroll to see all items.
2. **Project single-select** — Project field accepts only one project; should be multi-select like Area/Goal/Task.
3. **Cross-field filtering** — Selecting one entity type should restrict what appears in the other dropdowns (cascading filter).
4. **Detail page optimistic state** — Selecting a Goal or Task on the detail page appears to do nothing because there is no local optimistic update; changes only reflect after the network round-trip.

---

## Scope

### Files Changed

| File | Category |
|---|---|
| `src/lib/services/project.service.ts` | C — adds `linkedGoalIds` hydration |
| `src/components/entities/note-metadata-panel.tsx` | A, B, C — scroll, project multi-select, cross-filtering |
| `src/components/entities/note-task-selector.tsx` | A — scroll fix |
| `src/app/(dashboard)/notes/new/page.tsx` | B — project multi-select state |
| `src/app/(dashboard)/notes/[id]/page.tsx` | B, D — project multi-select + optimistic state |

---

## Group A — Scroll Fix

### Root Cause

`AreaSelector`, `GoalSelector` (in `note-metadata-panel.tsx`), and `NoteTaskSelector` wrap list items in `<ScrollArea className="max-h-56">` inside `CommandGroup` inside `CommandList`. Radix `ScrollArea` requires a fixed `h-` height on its outer container — not just `max-h-` — to constrain its internal viewport. Without that fixed height, the Radix viewport never overflows and the scrollbar never appears.

Additionally, `AreaSelector` and `GoalSelector` use `value={entity.id}` (a UUID) on each `CommandItem`. Because `shouldFilter` defaults to `true` in cmdk, typing in the search box filters against the UUID string — making search non-functional for all typed input.

### Fix

**In all three selectors:**
- Remove the `<ScrollArea>` wrapper.
- Add `className="max-h-56 overflow-y-auto"` directly to `<CommandList>`. This is the idiomatic shadcn/cmdk scroll pattern.

**In `AreaSelector` and `GoalSelector`:**
- Add `shouldFilter={false}` to `<Command>`.
- Add local `query` state + `onValueChange` on `<CommandInput>`.
- Filter items manually by name (same pattern `NoteTaskSelector` already uses).

---

## Group B — Project Multi-Select

### Current State

`NoteMetadataPanel` receives `projectId: string | null` and renders a shadcn `<Select>` (single-pick). The `new/page.tsx` page manages `projectId` with `useState<string | null>`. The `[id]/page.tsx` detail page reads `note.project_id`.

### Required State

`Note.linkedProjectIds?: string[]` is already populated by `hydrateNoteProjectLinks` in the note service. `CreateNoteInput` and `UpdateNoteInput` already accept `project_ids?: string[]`. `replaceProjectLinks` already exists in the note service. No backend changes needed.

### Changes

**`NoteMetadataPanel` props:**
```
projectId: string | null         →  projectIds: string[]
onProjectIdChange(id|null): void →  onProjectIdsChange(ids: string[]): void
```

**New `ProjectSelector` component** (inside `note-metadata-panel.tsx`):
- Same shape as `AreaSelector`: Popover + Command + CommandInput + CommandList + CommandItem with Checkbox.
- Shows badge chips for selected projects with X to deselect.
- `shouldFilter={false}` + manual query state.
- Scroll fix applied (same as Group A).

**`new/page.tsx`:**
- State: `const [projectIds, setProjectIds] = useState<string[]>([])`.
- `handleSave`: pass `project_ids: projectIds` (drop `project_id`).
- Panel props: `projectIds={projectIds} onProjectIdsChange={setProjectIds}`.

**`[id]/page.tsx`:**
- `projectId` reference replaced with `localProjectIds` (see Group D).
- Panel props: `projectIds={localProjectIds} onProjectIdsChange={...}`.

---

## Group C — Cross-Field Filtering

### Prerequisite: `Project.linkedGoalIds` Hydration

`Project.linkedGoalIds?: string[]` is defined in `domain.types.ts` but never populated by `project.service.ts`.

Add `hydrateProjectGoalLinks(projects: Project[]): Promise<Project[]>` to `project.service.ts`:
- Queries `goal_projects` table: `select("project_id, goal_id").in("project_id", projectIds)`.
- Builds `goalIdsByProjectId` map.
- Returns projects with `linkedGoalIds` set.
- Handles missing-table error gracefully (returns projects with `linkedGoalIds: []`).

Integrate by chaining: existing `hydrateProjectAreaLinks` → new `hydrateProjectGoalLinks` → return.

### Filtering Logic (in `NoteMetadataPanel`)

All four filtered lists are `useMemo` computations. If no constraints are active for a given list, the full active list is returned unchanged.

**`filteredAreas`** — constraint sources: `goalIds`, `projectIds`, `taskIds`
```
allowed = union of:
  • for each selectedGoalId   → goal.linkedAreaIds
  • for each selectedProjectId → project.linkedAreaIds
  • for each selectedTaskId   → tasks[taskId].project_id → project.linkedAreaIds
```

**`filteredGoals`** — constraint sources: `areaIds`, `projectIds`, `taskIds`
```
allowed = union of:
  • for each selectedAreaId    → goals whose linkedAreaIds includes areaId
  • for each selectedProjectId → project.linkedGoalIds
  • for each selectedTaskId    → tasks[taskId].project_id → project.linkedGoalIds
```

**`filteredProjects`** — constraint sources: `areaIds`, `goalIds`, `taskIds`
```
allowed = union of:
  • for each selectedAreaId  → projects whose linkedAreaIds includes areaId
  • for each selectedGoalId  → projects whose linkedGoalIds includes goalId
  • for each selectedTaskId  → tasks[taskId].project_id (direct)
```

**`filteredTasks`** — constraint sources: `areaIds`, `goalIds`, `projectIds`
```
allowedProjectIds = union of:
  • for each selectedAreaId    → projects whose linkedAreaIds includes areaId → project.id
  • for each selectedGoalId    → projects whose linkedGoalIds includes goalId → project.id
  • direct selectedProjectIds
result = tasks where task.project_id ∈ allowedProjectIds
```

### UX Behaviour

- Already-selected items remain selected even if they would not pass the current filter (the badge chips still display and the X still removes them).
- The dropdown trigger button still opens; it shows the filtered list only.
- If a filter would produce zero results (e.g., a project has no linked goals), the `CommandEmpty` message "No … found." displays — no special handling needed.

### Cascading Nature

Because selecting an Area filters the Goals dropdown, the user can only pick Goals that are already linked to the selected Area. This prevents structurally incompatible combinations without requiring intersection logic.

---

## Group D — Detail Page Optimistic State

### Root Cause

In `[id]/page.tsx`, the metadata panel receives:
```tsx
areaIds={note.linkedAreaIds ?? []}
goalIds={note.linkedGoalIds ?? []}
projectId={note.project_id}          // becomes projectIds
taskIds={note.linkedTaskIds ?? []}
```

These are derived directly from the React Query cache entry. When the user selects a goal, `save({ goal_ids: [...] })` fires an async mutation. The checkbox does not tick and no badge appears until the network round-trip completes and the cache updates — giving the appearance that nothing happened.

### Fix

Add four local state variables, initialised from the note, updated immediately on user action:

```tsx
const [localAreaIds,    setLocalAreaIds]    = useState<string[]>([]);
const [localGoalIds,    setLocalGoalIds]    = useState<string[]>([]);
const [localProjectIds, setLocalProjectIds] = useState<string[]>([]);
const [localTaskIds,    setLocalTaskIds]    = useState<string[]>([]);
```

Reset them in the existing `useEffect` that fires when `note` loads:
```tsx
useEffect(() => {
  if (note) {
    setLocalTitle(note.name);
    setLocalNotebook(note.notebook ?? "");
    setLocalAreaIds(note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []));
    setLocalGoalIds(note.linkedGoalIds ?? []);
    setLocalProjectIds(note.linkedProjectIds ?? (note.project_id ? [note.project_id] : []));
    setLocalTaskIds(note.linkedTaskIds ?? []);
    setPageTitle(note.name);
  }
  return () => setPageTitle("");
}, [note, setPageTitle]);
```

Pass local state to panel and update immediately on change:
```tsx
onAreaIdsChange={(ids) => { setLocalAreaIds(ids); save({ area_ids: ids }); }}
onGoalIdsChange={(ids) => { setLocalGoalIds(ids); save({ goal_ids: ids }); }}
onProjectIdsChange={(ids) => { setLocalProjectIds(ids); save({ project_ids: ids }); }}
onTaskIdsChange={(ids) => { setLocalTaskIds(ids); save({ task_ids: ids }); }}
```

This matches the existing pattern for `localTitle` (updated on input, saved on blur) and `localNotebook`.

---

## Error Handling

- `hydrateProjectGoalLinks`: graceful fallback if `goal_projects` table missing (returns `linkedGoalIds: []`).
- Cross-filter memos: if entity relationships are undefined/empty, treated as empty arrays — no crash.
- Detail page local state: on mutation error, the cache refetch will correct any divergence; no explicit rollback needed (error toast already displayed by `useUpdateNote`).

---

## Testing Checklist

- [ ] Area dropdown scrolls when list exceeds visible height
- [ ] Tasks dropdown scrolls when list exceeds visible height
- [ ] Searching by name in Area/Goal/Project dropdowns returns correct matches
- [ ] Project field is multi-select; selected projects show as badge chips
- [ ] Selecting an area filters goal dropdown to area's linked goals only
- [ ] Selecting a goal filters area dropdown to goal's linked areas only
- [ ] Selecting a project filters area/goal/task dropdowns correctly
- [ ] Selecting a task filters area/goal/project dropdowns correctly
- [ ] On detail page: selecting a goal shows checkbox ticked immediately (optimistic)
- [ ] On detail page: selecting a task shows badge immediately (optimistic)
- [ ] On detail page: reloading the page reflects all saved changes
- [ ] No regressions on new note page save flow
- [ ] No regressions on existing single-project notes (read via `linkedProjectIds`)
