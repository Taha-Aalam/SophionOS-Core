# Inbox TaskProcessForm 3D Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the inbox `TaskProcessForm` to parity with `TaskDialog` by applying the existing 3D cross-field cascade (project ↔ area ↔ goal) and pruning selected ids that fall out of the visible set.

**Architecture:** Extract `TaskProcessForm` to its own exported file so it can be unit-tested. In the new file, swap the existing 2D `useMemo`s for 3D `computeFilteredProjects` / `computeVisibleGoalsForProjects` / `computeVisibleAreasForProjects` from `task-dialog-filters.ts`. Add a third pruning `useEffect` for projects. In `inbox/page.tsx`, widen `projectOptions` additively to include `area_id` / `linkedAreaIds` / `linkedGoalIds` (other forms ignore the extras) and import the extracted form.

**Tech Stack:** Next.js (App Router), TypeScript, React 19, react-hook-form-free component state (`useState`), TanStack Query hooks, Vitest + Testing Library. Dev server on port 3030.

**Spec:** `docs/superpowers/specs/2026-06-04-inbox-task-process-cascade-design.md`

---

## File map

- Create: `src/components/entities/inbox-task-process-form.tsx` — extracted `TaskProcessForm` (exported) with 3D cascade wired.
- Modify: `src/app/(dashboard)/inbox/page.tsx` — widen `projectOptions` shape; import the extracted form; remove the inline `TaskProcessForm` definition.
- Create: `tests/unit/inbox-task-process-cascade.test.tsx` — 6 cascade cases against the extracted component.

No other files change. `task-dialog-filters.ts`, `project-dialog-filters.ts`, and `useUpdateTask` are reused as-is.

---

## Task 1: Commit the spec + plan

**Files:** none (git only)

- [ ] **Step 1: Create a feature branch off master**

Run:
```bash
git checkout -b inbox-task-process-cascade
```
Expected: `Switched to a new branch 'inbox-task-process-cascade'`

- [ ] **Step 2: Commit spec + plan**

Run:
```bash
git add "docs/superpowers/specs/2026-06-04-inbox-task-process-cascade-design.md" "docs/superpowers/plans/2026-06-04-inbox-task-process-cascade.md"
git commit -m "docs: spec + plan for inbox TaskProcessForm 3D cascade"
```
Expected: one commit created on the new branch.

---

## Task 2: Extract TaskProcessForm to its own file (no behavior change yet)

**Files:**
- Create: `src/components/entities/inbox-task-process-form.tsx`
- Modify: `src/app/(dashboard)/inbox/page.tsx:46-49, 460-705, 1469-1476`

- [ ] **Step 1: Create the new file with the verbatim form (still using 2D filters)**

Create `src/components/entities/inbox-task-process-form.tsx`:

```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateTask } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { TASK_STATUS } from "@/lib/utils/constants";
import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "@/lib/utils/project-dialog-filters";

const TASK_ICON = "☑️";
const UNSET = "__none__";

interface TaskProcessFormProps {
  task: Task;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  projectOptions: { id: string; name: string }[];
  onClose: () => void;
}

export function TaskProcessForm({
  task,
  areaOptions,
  goalOptions,
  projectOptions,
  onClose,
}: TaskProcessFormProps) {
  const updateTask = useUpdateTask();
  const [areaIds, setAreaIds] = useState<string[]>(
    task.linkedAreaIds ?? (task.area_id ? [task.area_id] : []),
  );
  const [goalIds, setGoalIds] = useState<string[]>(task.linkedGoalIds ?? []);
  const [projectIds, setProjectIds] = useState<string[]>(
    task.linkedProjectIds ?? (task.project_id ? [task.project_id] : []),
  );
  const [dueDate, setDueDate] = useState<string>(task.due_date ?? "");
  const [status, setStatus] = useState<string>(TASK_STATUS.TODO);
  const [priority, setPriority] = useState<string>(task.priority ?? UNSET);

  const toggleArea = (id: string) =>
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleGoal = (id: string) =>
    setGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleProject = (id: string) =>
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const visibleGoals = useMemo(
    () => filterProjectDialogGoals(goalOptions, areaIds),
    [goalOptions, areaIds],
  );
  const visibleAreas = useMemo(
    () => filterProjectDialogAreas(areaOptions, goalOptions, areaIds, goalIds),
    [areaOptions, goalOptions, areaIds, goalIds],
  );

  useEffect(() => {
    const allowedGoalIds = new Set(visibleGoals.map((goal) => goal.id));
    const nextGoalIds = goalIds.filter((goalId) => allowedGoalIds.has(goalId));
    if (nextGoalIds.length !== goalIds.length) {
      setGoalIds(nextGoalIds);
    }
  }, [visibleGoals, goalIds]);

  useEffect(() => {
    const allowedAreaIds = new Set(visibleAreas.map((area) => area.id));
    const nextAreaIds = areaIds.filter((areaId) => allowedAreaIds.has(areaId));
    if (nextAreaIds.length !== areaIds.length) {
      setAreaIds(nextAreaIds);
    }
  }, [visibleAreas, areaIds]);

  const handleSave = () => {
    updateTask.mutate(
      {
        id: task.id,
        input: {
          area_id: areaIds[0] ?? null,
          area_ids: areaIds,
          goal_ids: goalIds,
          project_id: projectIds[0] ?? null,
          project_ids: projectIds,
          due_date: dueDate || null,
          priority: priority === UNSET ? undefined : (priority as Task["priority"]),
          status: status as Task["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <DropdownMultiSelect
          label="Area"
          placeholder="Select area…"
          selectedCount={areaIds.length}
          candidates={visibleAreas}
          isSelected={(id) => areaIds.includes(id)}
          onToggle={toggleArea}
          onClear={() => setAreaIds([])}
          emptyMessage={
            areaOptions.length === 0
              ? "No areas available."
              : goalIds.length > 0
                ? "No areas match selected goals."
                : "No areas available."
          }
          renderSelected={() =>
            areaIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {areaIds
                  .map((id) => areaOptions.find((a) => a.id === id))
                  .filter((a): a is { id: string; name: string; icon?: string | null } =>
                    Boolean(a),
                  )
                  .map((area) => (
                    <Badge
                      key={area.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-[10px]"
                    >
                      {area.icon ? `${area.icon} ` : ""}
                      {area.name}
                      <button
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null
          }
        />

        <DropdownMultiSelect
          label="Goal"
          placeholder="Select goal…"
          selectedCount={goalIds.length}
          candidates={visibleGoals}
          isSelected={(id) => goalIds.includes(id)}
          onToggle={toggleGoal}
          onClear={() => setGoalIds([])}
          emptyMessage={
            goalOptions.length === 0
              ? "No goals available."
              : areaIds.length > 0
                ? "No goals in selected areas."
                : "No goals available."
          }
          renderSelected={() =>
            goalIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {goalIds
                  .map((id) => goalOptions.find((g) => g.id === id))
                  .filter(
                    (g): g is {
                      id: string;
                      name: string;
                      area_id: string | null;
                      linkedAreaIds?: string[];
                    } => Boolean(g),
                  )
                  .map((goal) => (
                    <Badge
                      key={goal.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-[10px]"
                    >
                      {goal.name}
                      <button
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null
          }
        />
      </div>

      <DropdownMultiSelect
        label="Project"
        placeholder="Select project…"
        selectedCount={projectIds.length}
        candidates={projectOptions}
        isSelected={(id) => projectIds.includes(id)}
        onToggle={toggleProject}
        onClear={() => setProjectIds([])}
        emptyMessage="No projects available."
        renderSelected={() =>
          projectIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {projectIds
                .map((id) => projectOptions.find((p) => p.id === id))
                .filter((p): p is { id: string; name: string } => Boolean(p))
                .map((project) => (
                  <Badge
                    key={project.id}
                    variant="secondary"
                    className="flex items-center gap-1 text-[10px]"
                  >
                    {project.name}
                    <button
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          ) : null
        }
      />

      <div className="grid gap-1.5 sm:max-w-xs">
        <span className="text-xs font-medium text-muted-foreground">Due Date</span>
        <DatePicker
          value={dueDate || null}
          onChange={(v) => setDueDate(v ?? "")}
          placeholder="Pick due date"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge
          variant="secondary"
          className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        >
          {TASK_ICON} task
        </Badge>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={updateTask.isPending}
          >
            Process
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DropdownMultiSelectProps {
  label: string;
  placeholder: string;
  selectedCount: number;
  candidates: { id: string; name: string; icon?: string | null }[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
  emptyMessage: string;
  renderSelected?: () => React.ReactNode;
}

function DropdownMultiSelect({
  label,
  placeholder,
  selectedCount,
  candidates,
  isSelected,
  onToggle,
  onClear,
  emptyMessage,
  renderSelected,
}: DropdownMultiSelectProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            {selectedCount === 0 ? placeholder : `${selectedCount} selected`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80">
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={onClear}
              className="text-xs"
            >
              Clear selection
            </DropdownMenuItem>
            <div className="max-h-64 overflow-y-auto">
              {candidates.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
              ) : (
                candidates.map((opt) => {
                  const checked = isSelected(opt.id);
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => onToggle(opt.id)}
                      className="flex items-center gap-2"
                    >
                      <span className="pointer-events-none">
                        <Checkbox checked={checked} />
                      </span>
                      {opt.icon ? `${opt.icon} ` : ""}
                      {opt.name}
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {renderSelected?.()}
    </div>
  );
}
```

- [ ] **Step 2: In `inbox/page.tsx`, remove the inline `TaskProcessForm` definition (lines 445-705) and the now-unused `TaskProcessFormProps` interface**

Delete the entire block from `// ─── Task processing form ───────` (line 445) through the closing `}` of the `TaskProcessForm` function (line 705). This removes the `filterProjectDialogGoals` and `filterProjectDialogAreas` imports usage from this file. Leave the `project-dialog-filters` import line alone for now — `ProjectProcessForm` still uses it (we'll clean up the import in step 3 only if it becomes unused).

- [ ] **Step 3: Add the import and use the extracted form in `inbox/page.tsx`**

Add to the imports block at the top:
```tsx
import { TaskProcessForm } from "@/components/entities/inbox-task-process-form";
```

Replace the `<TaskProcessForm ... />` JSX call (line 1469-1476) — keep props identical.

- [ ] **Step 4: Run typecheck**

Run: `pnpm lint`
Expected: passes (no new errors).

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: all existing tests pass (no behavior change yet).

- [ ] **Step 6: Commit the extraction**

Run:
```bash
git add "src/components/entities/inbox-task-process-form.tsx" "src/app/(dashboard)/inbox/page.tsx"
git commit -m "refactor(inbox): extract TaskProcessForm to its own file"
```

---

## Task 3: Widen `projectOptions` shape in inbox page

**Files:**
- Modify: `src/app/(dashboard)/inbox/page.tsx:1683-1689`

- [ ] **Step 1: Replace the `projectOptions` `useMemo`**

Find (lines 1683-1689):
```tsx
  const projectOptions = useMemo(
    () =>
      (allProjects ?? [])
        .filter((p) => !p.is_archived)
        .map((p) => ({ id: p.id, name: p.name })),
    [allProjects],
  );
```

Replace with:
```tsx
  const projectOptions = useMemo(
    () =>
      (allProjects ?? [])
        .filter((p) => !p.is_archived)
        .map((p) => ({
          id: p.id,
          name: p.name,
          area_id: p.area_id ?? null,
          linkedAreaIds: p.linkedAreaIds ?? [],
          linkedGoalIds: p.linkedGoalIds ?? [],
        })),
    [allProjects],
  );
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm lint`
Expected: passes. `Project` type carries `area_id` / `linkedAreaIds` / `linkedGoalIds` as nullable / optional fields (see `src/lib/types/domain.types.ts`).

- [ ] **Step 3: Commit**

Run:
```bash
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "feat(inbox): widen projectOptions to include linked fields"
```

---

## Task 4: Update `TaskProcessForm` props type to accept widened projects

**Files:**
- Modify: `src/components/entities/inbox-task-process-form.tsx:24-31`

- [ ] **Step 1: Replace the `TaskProcessFormProps.projectOptions` type**

Find:
```tsx
  projectOptions: { id: string; name: string }[];
```

Replace with:
```tsx
  projectOptions: {
    id: string;
    name: string;
    area_id?: string | null;
    linkedAreaIds?: string[];
    linkedGoalIds?: string[];
  }[];
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

Run:
```bash
git add "src/components/entities/inbox-task-process-form.tsx"
git commit -m "feat(inbox): accept widened projectOptions in TaskProcessForm"
```

---

## Task 5: Write the failing cascade test (case 1: no selections)

**Files:**
- Create: `tests/unit/inbox-task-process-cascade.test.tsx`

- [ ] **Step 1: Create the test file with the no-selection case**

Create `tests/unit/inbox-task-process-cascade.test.tsx`:

```tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateMutate = vi.fn();

vi.mock("@/lib/hooks/use-tasks", () => ({
  useUpdateTask: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

import { TaskProcessForm } from "@/components/entities/inbox-task-process-form";
import type { Task } from "@/lib/types/domain.types";

const baseTask: Task = {
  id: "task-1",
  user_id: "user-1",
  name: "Write spec",
  slug: "write-spec",
  description: null,
  status: "inbox",
  priority: "medium",
  area_id: null,
  project_id: null,
  is_archived: false,
  is_completed: false,
  is_focused: false,
  is_important: false,
  is_urgent: false,
  due_date: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
} as Task;

const areaOptions = [
  { id: "area-a", name: "Area A", icon: null },
  { id: "area-b", name: "Area B", icon: null },
  { id: "area-c", name: "Area C", icon: null },
];

const goalOptions = [
  { id: "goal-a", name: "Goal A", area_id: "area-a" as string | null, linkedAreaIds: [] },
  { id: "goal-b", name: "Goal B", area_id: "area-b" as string | null, linkedAreaIds: [] },
  { id: "goal-c", name: "Goal C", area_id: "area-c" as string | null, linkedAreaIds: [] },
];

const projectOptions = [
  {
    id: "proj-a",
    name: "Project A",
    area_id: "area-a",
    linkedAreaIds: ["area-a"],
    linkedGoalIds: ["goal-a"],
  },
  {
    id: "proj-b",
    name: "Project B",
    area_id: "area-b",
    linkedAreaIds: ["area-b"],
    linkedGoalIds: ["goal-b"],
  },
  {
    id: "proj-ab",
    name: "Project AB",
    area_id: null,
    linkedAreaIds: ["area-a", "area-b"],
    linkedGoalIds: ["goal-a", "goal-b"],
  },
  {
    id: "proj-c",
    name: "Project C",
    area_id: "area-c",
    linkedAreaIds: ["area-c"],
    linkedGoalIds: ["goal-c"],
  },
];

function openMenu(user: ReturnType<typeof userEvent.setup>, triggerLabel: string) {
  const buttons = screen.getAllByRole("button");
  const trigger = buttons.find((b) => b.textContent?.includes(triggerLabel));
  if (!trigger) throw new Error(`No trigger found for ${triggerLabel}`);
  return user.click(trigger);
}

describe("TaskProcessForm 3D cascade", () => {
  beforeEach(() => {
    mockUpdateMutate.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("case 1: with no selections, all three lists show full options", async () => {
    const user = userEvent.setup();
    render(
      <TaskProcessForm
        task={baseTask}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    await openMenu(user, "Select area…");
    expect(within(screen.getByRole("dialog")).getByText("Area A")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Area B")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Area C")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test — should FAIL (cascade not yet wired)**

Run: `pnpm test tests/unit/inbox-task-process-cascade.test.tsx`
Expected: PASS at this point. (Case 1 only checks the unfiltered baseline, which the 2D form already satisfies. We'll add the cascade cases next; those will fail until Task 6 lands.)

> Note: case 1 passes even on the current 2D form. Its job is to lock the test scaffolding (rendering + DropdownMenu opening) so the cascade cases in the next step can be written without setup thrash.

- [ ] **Step 3: Commit the scaffold test**

Run:
```bash
git add "tests/unit/inbox-task-process-cascade.test.tsx"
git commit -m "test(inbox): scaffold TaskProcessForm cascade test"
```

---

## Task 6: Wire the 3D cascade in TaskProcessForm

**Files:**
- Modify: `src/components/entities/inbox-task-process-form.tsx:5, 41-67, 92-98, 100-105`

- [ ] **Step 1: Update the imports**

Find:
```tsx
import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "@/lib/utils/project-dialog-filters";
```

Replace with:
```tsx
import {
  computeFilteredProjects,
  computeVisibleGoalsForProjects,
  computeVisibleAreasForProjects,
} from "@/lib/utils/task-dialog-filters";
```

- [ ] **Step 2: Add `projectById` memo + replace the two `useMemo` blocks with three**

Find the existing block:
```tsx
  const visibleGoals = useMemo(
    () => filterProjectDialogGoals(goalOptions, areaIds),
    [goalOptions, areaIds],
  );
  const visibleAreas = useMemo(
    () => filterProjectDialogAreas(areaOptions, goalOptions, areaIds, goalIds),
    [areaOptions, goalOptions, areaIds, goalIds],
  );
```

Replace with:
```tsx
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

- [ ] **Step 3: Add the project-prune `useEffect`**

After the existing second `useEffect` (the one that prunes `areaIds`), add:
```tsx
  useEffect(() => {
    const allowedProjectIds = new Set(filteredProjects.map((p) => p.id));
    const nextProjectIds = projectIds.filter((id) => allowedProjectIds.has(id));
    if (nextProjectIds.length !== projectIds.length) {
      setProjectIds(nextProjectIds);
    }
  }, [filteredProjects, projectIds]);
```

- [ ] **Step 4: Wire JSX candidates and emptyMessage for the project selector**

Find the project `DropdownMultiSelect` block. Change:
- `candidates={projectOptions}` → `candidates={filteredProjects}`
- `emptyMessage="No projects available."` → `emptyMessage={ projectOptions.length === 0 ? "No projects available." : goalIds.length > 0 || areaIds.length > 0 ? "No projects match selected context." : "No projects available." }`

- [ ] **Step 5: Run typecheck**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 6: Commit the cascade wiring**

Run:
```bash
git add "src/components/entities/inbox-task-process-form.tsx"
git commit -m "feat(inbox): apply 3D cross-field cascade in TaskProcessForm"
```

---

## Task 7: Add cascade cases 2–6 to the test file

**Files:**
- Modify: `tests/unit/inbox-task-process-cascade.test.tsx`

- [ ] **Step 1: Append cases 2–6 inside the existing `describe` block (before its closing `});`)**

Append:

```tsx
  it("case 2: pick area → project list shrinks to projects in that area", async () => {
    const user = userEvent.setup();
    render(
      <TaskProcessForm
        task={baseTask}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    await openMenu(user, "Select area…");
    await user.click(screen.getByText("Area A"));
    await openMenu(user, "Select project…");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Project A")).toBeInTheDocument();
    expect(within(dialog).getByText("Project AB")).toBeInTheDocument();
    expect(within(dialog).queryByText("Project B")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Project C")).not.toBeInTheDocument();
  });

  it("case 3: pick goal → area list shrinks to goal-linked area", async () => {
    const user = userEvent.setup();
    render(
      <TaskProcessForm
        task={baseTask}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    await openMenu(user, "Select goal…");
    await user.click(screen.getByText("Goal B"));
    await openMenu(user, "Select area…");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Area B")).toBeInTheDocument();
    expect(within(dialog).queryByText("Area A")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Area C")).not.toBeInTheDocument();
  });

  it("case 4: pick project → goal list shrinks to project-linked goals", async () => {
    const user = userEvent.setup();
    render(
      <TaskProcessForm
        task={baseTask}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    await openMenu(user, "Select project…");
    await user.click(screen.getByText("Project A"));
    await openMenu(user, "Select goal…");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Goal A")).toBeInTheDocument();
    expect(within(dialog).queryByText("Goal B")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Goal C")).not.toBeInTheDocument();
  });

  it("case 5: prune projects → picking project that excludes current goal deselects the goal", async () => {
    const user = userEvent.setup();
    const taskWithGoal: Task = {
      ...baseTask,
      linkedGoalIds: ["goal-a"],
      linkedProjectIds: [],
    };

    render(
      <TaskProcessForm
        task={taskWithGoal}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    // goal-a is already in the badge list (selected)
    expect(screen.getByText("Goal A")).toBeInTheDocument();

    // pick project-c, which has linkedGoalIds=[goal-c] only
    await openMenu(user, "Select project…");
    await user.click(screen.getByText("Project C"));

    // goal-a should be deselected by the prune effect
    expect(screen.queryByText("Goal A")).not.toBeInTheDocument();
  });

  it("case 6: multi-project union → two unrelated projects' linkedGoalIds are unioned", async () => {
    const user = userEvent.setup();
    render(
      <TaskProcessForm
        task={baseTask}
        areaOptions={areaOptions}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
        onClose={() => {}}
      />,
    );

    // Pick Project A (linkedGoalIds=[goal-a]) and Project C (linkedGoalIds=[goal-c])
    await openMenu(user, "Select project…");
    await user.click(screen.getByText("Project A"));
    await openMenu(user, "Select project…");
    await user.click(screen.getByText("Project C"));

    // Open the goal menu — both goal-a and goal-c should be visible
    await openMenu(user, "selected");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Goal A")).toBeInTheDocument();
    expect(within(dialog).getByText("Goal C")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test — should PASS for all 6 cases**

Run: `pnpm test tests/unit/inbox-task-process-cascade.test.tsx`
Expected: 6 passing tests.

If case 2 fails because the area-menu first option is the project menu (e.g. trigger order matters), use a more specific selector such as the trigger button that contains text "Select area…" or the "Select project…" placeholder. Adjust the test only — do not change production code.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass — including the previously-existing `status-reroute-on-create.test.ts` and `status-reroute-on-update.test.ts`.

- [ ] **Step 4: Commit the cascade cases**

Run:
```bash
git add "tests/unit/inbox-task-process-cascade.test.tsx"
git commit -m "test(inbox): cover 3D cascade cases for TaskProcessForm"
```

---

## Task 8: Final verification + manual smoke

**Files:** none

- [ ] **Step 1: Run typecheck + lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 3: Manual smoke in dev server**

Run: `npx kill-port 3030` (only if a previous dev server is still bound to the port), then `pnpm dev` to start.

Open `http://localhost:3030/inbox`. For any task row, click **Process**, then:
1. Confirm Area, Goal, Project selectors all populate.
2. Pick an Area → Goal list and Project list both shrink.
3. Pick a Project → Goal list and Area list both shrink.
4. Pick a second Project → Goal list is the union of the two projects' `linkedGoalIds`.
5. Deselect a project that had no goal/area left → selections prune cleanly.
6. Click **Process** → the row updates and the form closes.

- [ ] **Step 4: Final commit (if smoke surfaced any tweak)**

If a tweak was needed, commit it with a clear message. Otherwise skip.

---

## Self-Review

**Spec coverage check:**
- §"Cascade Wiring" → Task 6
- §"JSX Wiring" → Task 6 step 4
- §"Filter Semantics" → Task 6 (reused as-is from `task-dialog-filters.ts`)
- §"Data Flow" → implicit, no separate task needed
- §"Error Handling" → Task 6 step 4 (emptyMessage) + pruning guard
- §"Testing" → Tasks 5, 7
- §"Test Surface (revised)" / extraction → Task 2
- §"Files Changed" → Tasks 2, 3, 4, 6, 7

**Placeholder scan:** none — every step has concrete code or commands.

**Type consistency:** `TaskProcessFormProps.projectOptions` shape matches between Task 4 (widening the type), Task 6 step 1 (no shape change in imports), and Task 6 step 2 (using `Map<string, ...>` keyed on the same id). The widened shape's `area_id` / `linkedAreaIds` / `linkedGoalIds` are all optional/nullable — matches the `FilterableProject` interface in `task-dialog-filters.ts:4-9`.
