# Goal Card Correlations & Card Standardization

**Date:** 2026-05-17  
**Status:** Approved

## Overview

Four related fixes:
1. Add correlation stats row (projects / tasks / notes / resources) to `GoalCard` — placed between the description line and the due-date row, matching the emoji-icon style of `AreaCard` and `ProjectCard`.
2. Pass rollup data to `GoalCard` on the Area detail page goals section.
3. Pass rollup data to `GoalCard` on the Project detail page goals section.
4. Fix missing `areaIcons` prop on `ProjectCard` rendered inside the Goal detail page (causes Lucide `Map` icon instead of emoji in the area badge).

Because `useAreaDetail` and `useGoals` both call `goalService.list()`, adding rollup hydration to the service means all callers automatically receive the counts on the `Goal` object — no local data-join needed in the detail pages.

---

## 1. Domain Types

**File:** `src/lib/types/domain.types.ts`

Add optional rollup fields to the `Goal` interface (same pattern as `linkedAreaIds`):

```ts
projectCount?: number;
taskCount?: number;
noteCount?: number;
resourceCount?: number;
```

---

## 2. Goal Service — Rollup Hydration

**File:** `src/lib/services/goal.service.ts`

### New internal function `hydrateGoalRollupCounts`

```ts
async function hydrateGoalRollupCounts(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) return goals;
  const goalIds = goals.map((g) => g.id);

  const [{ data: projectLinks }, { data: taskLinks }, { data: noteLinks }, { data: resourceLinks }] =
    await Promise.all([
      createClient().from("goal_projects").select("goal_id").in("goal_id", goalIds),
      createClient().from("goal_tasks").select("goal_id").in("goal_id", goalIds),
      createClient().from("goal_notes").select("goal_id").in("goal_id", goalIds),
      createClient().from("goal_resources").select("goal_id").in("goal_id", goalIds),
    ]);

  const countFor = (links: { goal_id: string }[] | null, id: string) =>
    (links ?? []).filter((r) => r.goal_id === id).length;

  return goals.map((goal) => ({
    ...goal,
    projectCount: countFor(projectLinks, goal.id),
    taskCount: countFor(taskLinks, goal.id),
    noteCount: countFor(noteLinks, goal.id),
    resourceCount: countFor(resourceLinks, goal.id),
  }));
}
```

### Update `goalService.list()`

Add `hydrateGoalRollupCounts` as a third parallel call:

```ts
const [goalsWithAreas, goalsWithProgress, goalsWithRollups] = await Promise.all([
  hydrateGoalAreaLinks(rawGoals),
  hydrateGoalProgress(rawGoals),
  hydrateGoalRollupCounts(rawGoals),
]);

let goals = goalsWithAreas.map((goal, i) => ({
  ...goal,
  progress: goalsWithProgress[i]?.progress ?? goal.progress,
  projectCount: goalsWithRollups[i]?.projectCount,
  taskCount: goalsWithRollups[i]?.taskCount,
  noteCount: goalsWithRollups[i]?.noteCount,
  resourceCount: goalsWithRollups[i]?.resourceCount,
}));
```

---

## 3. GoalCard Component

**File:** `src/components/entities/goal-card.tsx`

### New exported interface

```ts
export interface GoalCardRollups {
  projectCount: number;
  taskCount: number;
  noteCount: number;
  resourceCount: number;
}
```

### New prop

Add `rollups?: GoalCardRollups` to `GoalCardProps`.

### Correlation row

Insert between the description block (`{goal.description && ...}`) and the existing due-date row (`<div className="mt-4 flex items-center justify-between ..."`):

```tsx
{rollups && (
  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
    <span className="flex items-center gap-1 whitespace-nowrap" title="Projects">
      <span className="text-xs">📁</span>
      <span>{rollups.projectCount}</span>
    </span>
    <span className="flex items-center gap-1 whitespace-nowrap" title="Tasks">
      <span className="text-xs">☑️</span>
      <span>{rollups.taskCount}</span>
    </span>
    <span className="flex items-center gap-1 whitespace-nowrap" title="Notes">
      <span className="text-xs">📝</span>
      <span>{rollups.noteCount}</span>
    </span>
    <span className="flex items-center gap-1 whitespace-nowrap" title="Resources">
      <span className="text-xs">🔗</span>
      <span>{rollups.resourceCount}</span>
    </span>
  </div>
)}
```

---

## 4. Goals Page

**File:** `src/app/(dashboard)/goals/page.tsx`

Goals from `useGoals()` now carry rollup fields. Pass them to `GoalCard`:

```tsx
rollups={
  goal.projectCount !== undefined
    ? {
        projectCount: goal.projectCount,
        taskCount: goal.taskCount ?? 0,
        noteCount: goal.noteCount ?? 0,
        resourceCount: goal.resourceCount ?? 0,
      }
    : undefined
}
```

---

## 5. Area Detail Page — GoalCard Rollups

**File:** `src/app/(dashboard)/areas/[id]/page.tsx`

`areaData.goals` comes from `goalService.list()` (via `useAreaDetail`), which now includes rollup fields. Pass them to `GoalCard`:

```tsx
<GoalCard
  key={goal.id}
  goal={goal}
  areaName={area.name}
  areaNames={[area.name]}
  areaIcons={[area.icon ?? null]}
  onEdit={...}
  rollups={
    goal.projectCount !== undefined
      ? {
          projectCount: goal.projectCount,
          taskCount: goal.taskCount ?? 0,
          noteCount: goal.noteCount ?? 0,
          resourceCount: goal.resourceCount ?? 0,
        }
      : undefined
  }
/>
```

---

## 6. Project Detail Page — GoalCard Rollups

**File:** `src/app/(dashboard)/projects/[id]/page.tsx`

`linkedGoals` is derived from `useGoals({ status: "all" })`, which also goes through `goalService.list()`. Pass rollups to `GoalCard`:

```tsx
<GoalCard
  goal={goal}
  areaNames={goalAreaNames.length > 0 ? goalAreaNames : undefined}
  areaIcons={goalAreaIcons}
  onEdit={...}
  rollups={
    goal.projectCount !== undefined
      ? {
          projectCount: goal.projectCount,
          taskCount: goal.taskCount ?? 0,
          noteCount: goal.noteCount ?? 0,
          resourceCount: goal.resourceCount ?? 0,
        }
      : undefined
  }
/>
```

---

## 7. Goal Detail Page — ProjectCard areaIcons Fix

**File:** `src/app/(dashboard)/goals/[id]/page.tsx`

### Problem
`ProjectCard` is rendered without `areaIcons`. The component's area badge falls back to the Lucide `Map` icon instead of the emoji.

### Fix

Add `areaIconsMap` memo alongside the existing `areaNames` memo:

```ts
const areaIconsMap = useMemo(
  () => new Map(areas.map((a) => [a.id, a.icon ?? null])),
  [areas],
);
```

Add `getProjectAreaIcons` callback alongside the existing `getProjectAreaNames`:

```ts
const getProjectAreaIcons = useCallback(
  (project: Project) =>
    getProjectLinkedAreaIds(project).map((id) => areaIconsMap.get(id) ?? null),
  [areaIconsMap],
);
```

Pass to `ProjectCard`:

```tsx
<ProjectCard
  key={project.id}
  project={project}
  areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
  areaNames={getProjectAreaNames(project)}
  areaIcons={getProjectAreaIcons(project)}
  returnTo={currentPagePathWithSlug}
  rollups={projectRollups.get(project.id)}
/>
```

---

## Implementation Order

1. `src/lib/types/domain.types.ts` — add optional rollup fields to `Goal`
2. `src/lib/services/goal.service.ts` — add `hydrateGoalRollupCounts`, update `list()`
3. `src/components/entities/goal-card.tsx` — add `GoalCardRollups` + `rollups` prop + row
4. `src/app/(dashboard)/goals/page.tsx` — pass rollups from goal fields
5. `src/app/(dashboard)/goals/[id]/page.tsx` — add `areaIconsMap`, `getProjectAreaIcons`, pass to ProjectCard
6. `src/app/(dashboard)/areas/[id]/page.tsx` — pass rollups from goal fields to GoalCard
7. `src/app/(dashboard)/projects/[id]/page.tsx` — pass rollups from goal fields to GoalCard

---

## Out of Scope

- Rollups on `useGoalDetail` (already has them in `GoalDetailData.rollups`)
- GoalCard inside the Contacts detail page (not mentioned)
- Any DB migration (all junction tables already exist)
