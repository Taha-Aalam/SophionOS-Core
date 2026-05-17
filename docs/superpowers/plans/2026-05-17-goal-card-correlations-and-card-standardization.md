# Goal Card Correlations & Card Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a projects/tasks/notes/resources correlation row to `GoalCard` everywhere it appears, and fix a missing `areaIcons` prop on `ProjectCard` in the goal detail page.

**Architecture:** Extend `goalService.list()` with a new parallel hydration that fetches counts from the four goal junction tables (`goal_projects`, `goal_tasks`, `goal_notes`, `goal_resources`) and attaches them as optional fields on each `Goal` object. Since `useAreaDetail` and `useGoals` both call `goalService.list()`, every consumer receives the counts automatically — no local data joins needed. The `GoalCard` component gets a new optional `rollups` prop that renders the emoji-icon stats row (identical layout to `ProjectCard`).

**Tech Stack:** TypeScript, React 19, Next.js 16, Supabase JS v2, TanStack Query v5, Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/lib/types/domain.types.ts` | Add 4 optional rollup fields to `Goal` interface |
| `src/lib/services/goal.service.ts` | Add `hydrateGoalRollupCounts`, update `list()` |
| `src/lib/__tests__/goals.utils.test.ts` | Add test for rollup field presence on Goal type (type-level) |
| `src/components/entities/goal-card.tsx` | Add `GoalCardRollups` interface + `rollups` prop + row |
| `src/app/(dashboard)/goals/page.tsx` | Pass rollups from goal fields |
| `src/app/(dashboard)/goals/[id]/page.tsx` | Add `areaIconsMap` + `getProjectAreaIcons` + pass to ProjectCard |
| `src/app/(dashboard)/areas/[id]/page.tsx` | Pass rollups from goal fields to GoalCard |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Pass rollups from goal fields to GoalCard |

---

## Task 1: Extend Goal Type with Optional Rollup Fields

**Files:**
- Modify: `src/lib/types/domain.types.ts:10-12`

- [ ] **Step 1: Add rollup fields to the Goal interface**

Open `src/lib/types/domain.types.ts`. The `Goal` interface currently reads:

```ts
export interface Goal extends DatabaseTable<"goals"> {
  linkedAreaIds?: string[];
}
```

Replace it with:

```ts
export interface Goal extends DatabaseTable<"goals"> {
  linkedAreaIds?: string[];
  projectCount?: number;
  taskCount?: number;
  noteCount?: number;
  resourceCount?: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no new errors related to `Goal`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/domain.types.ts
git commit -m "feat: add optional rollup count fields to Goal type"
```

---

## Task 2: Hydrate Goal Rollup Counts in Service

**Files:**
- Modify: `src/lib/services/goal.service.ts`

- [ ] **Step 1: Add the `hydrateGoalRollupCounts` function**

In `src/lib/services/goal.service.ts`, add this function directly after the closing `}` of `hydrateGoalProgress` (around line 205):

```ts
async function hydrateGoalRollupCounts(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) return goals;
  const goalIds = goals.map((g) => g.id);

  const [
    { data: projectLinks },
    { data: taskLinks },
    { data: noteLinks },
    { data: resourceLinks },
  ] = await Promise.all([
    createClient().from("goal_projects").select("goal_id").in("goal_id", goalIds),
    createClient().from("goal_tasks").select("goal_id").in("goal_id", goalIds),
    createClient().from("goal_notes").select("goal_id").in("goal_id", goalIds),
    createClient().from("goal_resources").select("goal_id").in("goal_id", goalIds),
  ]);

  const countFor = (links: { goal_id: string }[] | null, id: string): number =>
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

- [ ] **Step 2: Update `goalService.list()` to run the new hydration in parallel**

In `goalService.list()`, find this block (around line 253):

```ts
const [goalsWithAreas, goalsWithProgress] = await Promise.all([
  hydrateGoalAreaLinks(rawGoals),
  hydrateGoalProgress(rawGoals),
]);

let goals = goalsWithAreas.map((goal, i) => ({
  ...goal,
  progress: goalsWithProgress[i]?.progress ?? goal.progress,
}));
```

Replace it with:

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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
pnpm test
```

Expected: all tests pass (the existing `goals.utils.test.ts` tests don't hit the service, so they pass unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/goal.service.ts
git commit -m "feat: hydrate rollup counts (projects/tasks/notes/resources) in goalService.list"
```

---

## Task 3: Add Rollups Row to GoalCard

**Files:**
- Modify: `src/components/entities/goal-card.tsx`

- [ ] **Step 1: Add the `GoalCardRollups` interface and prop**

Open `src/components/entities/goal-card.tsx`. After the existing imports, add the exported interface. Then add `rollups` to `GoalCardProps`.

Replace the `GoalCardProps` interface block:

```ts
interface GoalCardProps {
  goal: Goal;
  areaName?: string;
  /**
   * When provided, renders chips for each linked area name (up to 2, with a
   * `+N` overflow chip). Falls back to `areaName` for backwards compatibility.
   */
  areaNames?: string[];
  areaIcons?: (string | null)[];
  onEdit?: (goal: Goal) => void;
  duplicateIndex?: number;
}
```

With:

```ts
export interface GoalCardRollups {
  projectCount: number;
  taskCount: number;
  noteCount: number;
  resourceCount: number;
}

interface GoalCardProps {
  goal: Goal;
  areaName?: string;
  /**
   * When provided, renders chips for each linked area name (up to 2, with a
   * `+N` overflow chip). Falls back to `areaName` for backwards compatibility.
   */
  areaNames?: string[];
  areaIcons?: (string | null)[];
  onEdit?: (goal: Goal) => void;
  duplicateIndex?: number;
  rollups?: GoalCardRollups;
}
```

- [ ] **Step 2: Update the component signature to destructure `rollups`**

Find the function signature:

```ts
export function GoalCard({ goal, areaName, areaNames, areaIcons, onEdit, duplicateIndex }: GoalCardProps) {
```

Replace with:

```ts
export function GoalCard({ goal, areaName, areaNames, areaIcons, onEdit, duplicateIndex, rollups }: GoalCardProps) {
```

- [ ] **Step 3: Insert the correlation row between description and due date**

In the JSX, find this block (the description paragraph followed by the closing `</div>` of the flex-1 section):

```tsx
            {goal.description && (
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {goal.description}
              </p>
            )}
          </div>

          <ProgressRing
```

Replace with:

```tsx
            {goal.description && (
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {goal.description}
              </p>
            )}

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
          </div>

          <ProgressRing
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/entities/goal-card.tsx
git commit -m "feat: add rollups correlation row to GoalCard"
```

---

## Task 4: Goals Page — Pass Rollups to GoalCard

**Files:**
- Modify: `src/app/(dashboard)/goals/page.tsx`

- [ ] **Step 1: Import `GoalCardRollups` at the top of the file**

Find the existing `GoalCard` import line:

```ts
import { GoalCard } from "@/components/entities/goal-card";
```

Replace with:

```ts
import { GoalCard, type GoalCardRollups } from "@/components/entities/goal-card";
```

- [ ] **Step 2: Pass rollups to GoalCard inside the goals map**

Find the existing `<GoalCard` render (around line 185):

```tsx
            return (
              <GoalCard
                goal={goal}
                areaName={goal.area_id ? areaNamesById.get(goal.area_id) : "Unassigned"}
                areaNames={linkedAreaNames}
                areaIcons={linkedAreaIcons}
                duplicateIndex={duplicateIndices.get(goal.id)}
                onEdit={() => {
                  router.push(buildGoalDetailHref(goal));
```

Add the `rollups` prop after `duplicateIndex`:

```tsx
            return (
              <GoalCard
                goal={goal}
                areaName={goal.area_id ? areaNamesById.get(goal.area_id) : "Unassigned"}
                areaNames={linkedAreaNames}
                areaIcons={linkedAreaIcons}
                duplicateIndex={duplicateIndices.get(goal.id)}
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
                onEdit={() => {
                  router.push(buildGoalDetailHref(goal));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify visually**

```bash
pnpm dev
```

Open `http://localhost:3030/goals`. Confirm each GoalCard now shows the emoji stats row (📁 📝 ☑️ 🔗 with counts) between the description and the due-date row.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/goals/page.tsx
git commit -m "feat: pass rollup counts to GoalCard on goals page"
```

---

## Task 5: Goal Detail Page — Fix areaIcons on ProjectCard

**Files:**
- Modify: `src/app/(dashboard)/goals/[id]/page.tsx`

- [ ] **Step 1: Add `getProjectLinkedAreaIds` to the existing import from projects utils**

Find the existing import line (around line 73):

```ts
import { calculateGoalProgress, getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";
```

`getProjectLinkedAreaIds` is already imported. No change needed here.

- [ ] **Step 2: Add `areaIconsMap` memo alongside the existing `areaNames` memo**

Find this block (around line 256):

```ts
  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIcons = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
```

If `areaIcons` already exists as a Map, it can be reused. Check whether the variable name `areaIcons` is already a `Map<string, string | null>` — it is:

```ts
const areaIcons = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
```

This map already exists. The problem is that `getProjectAreaIcons` callback is missing. Proceed to next step.

- [ ] **Step 3: Add `getProjectAreaIcons` callback alongside `getProjectAreaNames`**

Find the existing `getProjectAreaNames` callback (around line 258):

```ts
  const getProjectAreaNames = useCallback(
    (project: Project) =>
      getProjectLinkedAreaIds(project)
        .map((id) => areaNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [areaNames],
  );
```

Add the new callback directly after it:

```ts
  const getProjectAreaIcons = useCallback(
    (project: Project) =>
      getProjectLinkedAreaIds(project).map((id) => areaIcons.get(id) ?? null),
    [areaIcons],
  );
```

- [ ] **Step 4: Pass `areaIcons` to ProjectCard in the projects section**

Find the `ProjectCard` render in the projects section (around line 1015):

```tsx
                <ProjectCard
                  key={project.id}
                  project={project}
                  areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                  areaNames={getProjectAreaNames(project)}
                  returnTo={currentPagePathWithSlug}
                  rollups={projectRollups.get(project.id)}
                />
```

Replace with:

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

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify visually**

Open a goal detail page that has linked projects whose area has an emoji icon set. Confirm the area badge in the ProjectCard now shows the emoji instead of the Map (🗺️) icon.

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/goals/[id]/page.tsx
git commit -m "fix: pass areaIcons to ProjectCard on goal detail page"
```

---

## Task 6: Area Detail Page — Pass Rollups to GoalCard

**Files:**
- Modify: `src/app/(dashboard)/areas/[id]/page.tsx`

- [ ] **Step 1: Import `GoalCardRollups` type**

Find the existing `GoalCard` import:

```ts
import { GoalCard } from "@/components/entities/goal-card";
```

Replace with:

```ts
import { GoalCard, type GoalCardRollups } from "@/components/entities/goal-card";
```

- [ ] **Step 2: Pass rollups to each GoalCard in the goals section**

Find the `GoalCard` render inside the goals section (around line 719):

```tsx
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area.name}
                    areaNames={[area.name]}
                    areaIcons={[area.icon ?? null]}
                    onEdit={() => router.push(`${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(goalReturnTo)}`)}
                  />
```

Replace with:

```tsx
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area.name}
                    areaNames={[area.name]}
                    areaIcons={[area.icon ?? null]}
                    onEdit={() => router.push(`${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(goalReturnTo)}`)}
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify visually**

Open an area detail page. In the Goals section, each GoalCard should now show the correlation stats row.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/areas/[id]/page.tsx
git commit -m "feat: pass rollup counts to GoalCard on area detail page"
```

---

## Task 7: Project Detail Page — Pass Rollups to GoalCard

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Import `GoalCardRollups` type**

Find the existing `GoalCard` import:

```ts
import { GoalCard } from "@/components/entities/goal-card";
```

Replace with:

```ts
import { GoalCard, type GoalCardRollups } from "@/components/entities/goal-card";
```

- [ ] **Step 2: Pass rollups to each GoalCard in the goals section**

Find the `GoalCard` render inside the goals section (around line 1028):

```tsx
                    <GoalCard
                      goal={goal}
                      areaNames={goalAreaNames.length > 0 ? goalAreaNames : undefined}
                      areaIcons={goalAreaIcons}
                      onEdit={() =>
                        router.push(
                          `${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(`/projects/${project.slug ?? project.id}`)}`,
                        )
                      }
                    />
```

Replace with:

```tsx
                    <GoalCard
                      goal={goal}
                      areaNames={goalAreaNames.length > 0 ? goalAreaNames : undefined}
                      areaIcons={goalAreaIcons}
                      onEdit={() =>
                        router.push(
                          `${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(`/projects/${project.slug ?? project.id}`)}`,
                        )
                      }
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Verify visually**

Open a project detail page that has linked goals. In the Goals section, each GoalCard should show the correlation stats row with counts.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: pass rollup counts to GoalCard on project detail page"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|-----------------|-----------|
| Correlation row on GoalCard (projects/tasks/notes/resources) between description and due date | Task 3 |
| Rollup data on Goals page | Tasks 2 + 4 |
| Rollup data on Area detail GoalCard | Tasks 2 + 6 |
| Rollup data on Project detail GoalCard | Tasks 2 + 7 |
| Fix areaIcons on ProjectCard in Goal detail page | Task 5 |
| GoalCardRollups exported interface | Task 3 |
| Optional rollup fields on Goal domain type | Task 1 |
| hydrateGoalRollupCounts service function | Task 2 |
