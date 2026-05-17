import { describe, it, expect } from "vitest";

import {
  computeFilteredOptions,
  cleanInvalidSelections,
  buildGoalProjectMaps,
  buildGoalTaskMaps,
  filterAreas,
  filterProjects,
  filterGoals,
  filterTasks,
  type AreaEntity,
  type GoalEntity,
  type ProjectEntity,
  type TaskEntity,
  type GoalProjectRelation,
  type GoalTaskRelation,
} from "@/lib/utils/contact-relationship-filters";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const areas: AreaEntity[] = [
  { id: "a1", name: "Area 1", archive: false },
  { id: "a2", name: "Area 2", archive: false },
  { id: "a3", name: "Area 3", archive: true },
  { id: "a4", name: "Area 4", archive: false },
];

const goals: GoalEntity[] = [
  { id: "g1", name: "Goal 1", is_archived: false, linkedAreaIds: ["a1"] },
  { id: "g2", name: "Goal 2", is_archived: false, linkedAreaIds: ["a2"] },
  { id: "g3", name: "Goal 3", is_archived: true, linkedAreaIds: ["a1"] },
  { id: "g4", name: "Goal 4", is_archived: false, linkedAreaIds: ["a1", "a2"] },
];

const projects: ProjectEntity[] = [
  { id: "p1", name: "Project 1", is_archived: false, linkedAreaIds: ["a1"] },
  { id: "p2", name: "Project 2", is_archived: false, linkedAreaIds: ["a2"] },
  { id: "p3", name: "Project 3", is_archived: true, linkedAreaIds: ["a1"] },
  { id: "p4", name: "Project 4", is_archived: false, linkedAreaIds: ["a1", "a2"] },
];

const tasks: TaskEntity[] = [
  { id: "t1", name: "Task 1", linkedAreaIds: ["a1"], project_id: "p1" },
  { id: "t2", name: "Task 2", linkedAreaIds: ["a2"], project_id: "p2" },
  { id: "t3", name: "Task 3", linkedAreaIds: ["a1"], project_id: "p1" },
  { id: "t4", name: "Task 4", linkedAreaIds: [], project_id: null },
];

const goalProjectRelations: GoalProjectRelation[] = [
  { goal_id: "g1", project_id: "p1" },
  { goal_id: "g2", project_id: "p2" },
  { goal_id: "g4", project_id: "p1" },
  { goal_id: "g4", project_id: "p4" },
];

const goalTaskRelations: GoalTaskRelation[] = [
  { goal_id: "g1", task_id: "t1" },
  { goal_id: "g2", task_id: "t2" },
  { goal_id: "g4", task_id: "t3" },
];

function makeInputs(overrides: Partial<Parameters<typeof computeFilteredOptions>[0]> = {}) {
  return {
    allAreas: areas,
    allGoals: goals,
    allProjects: projects,
    allTasks: tasks,
    selectedAreaIds: [],
    selectedGoalIds: [],
    selectedProjectIds: [],
    selectedTaskIds: [],
    goalProjectRelations,
    goalTaskRelations,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildGoalProjectMaps
// ---------------------------------------------------------------------------

describe("buildGoalProjectMaps", () => {
  it("builds forward and reverse maps", () => {
    const { goalToProjectIds, projectToGoalIds } = buildGoalProjectMaps(goalProjectRelations);

    expect(goalToProjectIds.get("g1")).toEqual(["p1"]);
    expect(goalToProjectIds.get("g4")).toEqual(["p1", "p4"]);
    expect(projectToGoalIds.get("p1")).toEqual(["g1", "g4"]);
    expect(projectToGoalIds.get("p2")).toEqual(["g2"]);
  });

  it("returns empty maps for empty input", () => {
    const { goalToProjectIds, projectToGoalIds } = buildGoalProjectMaps([]);
    expect(goalToProjectIds.size).toBe(0);
    expect(projectToGoalIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildGoalTaskMaps
// ---------------------------------------------------------------------------

describe("buildGoalTaskMaps", () => {
  it("builds forward and reverse maps", () => {
    const { goalToTaskIds, taskToGoalIds } = buildGoalTaskMaps(goalTaskRelations);

    expect(goalToTaskIds.get("g1")).toEqual(["t1"]);
    expect(taskToGoalIds.get("t1")).toEqual(["g1"]);
    expect(taskToGoalIds.get("t2")).toEqual(["g2"]);
  });
});

// ---------------------------------------------------------------------------
// filterAreas
// ---------------------------------------------------------------------------

describe("filterAreas", () => {
  it("returns all active areas when nothing is selected", () => {
    const result = filterAreas({
      allAreas: areas,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      selectedGoals: [],
      selectedProjects: [],
    });
    expect(result.map((a) => a.id)).toEqual(["a1", "a2", "a4"]);
  });

  it("filters by tasks when tasks are selected", () => {
    const result = filterAreas({
      allAreas: areas,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: ["t1"],
      selectedTasks: [tasks[0]], // t1 -> a1
      selectedGoals: [],
      selectedProjects: [],
    });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("filters by goals when goals are selected", () => {
    const result = filterAreas({
      allAreas: areas,
      selectedAreaIds: [],
      selectedGoalIds: ["g2"],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      selectedGoals: [goals[1]], // g2 -> a2
      selectedProjects: [],
    });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("filters by projects when projects are selected", () => {
    const result = filterAreas({
      allAreas: areas,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: ["p4"],
      selectedTaskIds: [],
      selectedTasks: [],
      selectedGoals: [],
      selectedProjects: [projects[3]], // p4 -> a1, a2
    });
    expect(result.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("tasks take precedence over goals", () => {
    const result = filterAreas({
      allAreas: areas,
      selectedAreaIds: [],
      selectedGoalIds: ["g2"], // g2 -> a2
      selectedProjectIds: [],
      selectedTaskIds: ["t1"], // t1 -> a1
      selectedTasks: [tasks[0]],
      selectedGoals: [goals[1]],
      selectedProjects: [],
    });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });
});

// ---------------------------------------------------------------------------
// filterProjects
// ---------------------------------------------------------------------------

describe("filterProjects", () => {
  it("returns all active projects when nothing is selected", () => {
    const result = filterProjects({
      allProjects: projects,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      goalToProjectIds: buildGoalProjectMaps(goalProjectRelations).goalToProjectIds,
    });
    expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p4"]);
  });

  it("filters by tasks when tasks are selected", () => {
    const result = filterProjects({
      allProjects: projects,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: ["t1"],
      selectedTasks: [tasks[0]], // t1 -> p1
      goalToProjectIds: buildGoalProjectMaps(goalProjectRelations).goalToProjectIds,
    });
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filters by goals when goals are selected", () => {
    const { goalToProjectIds } = buildGoalProjectMaps(goalProjectRelations);
    const result = filterProjects({
      allProjects: projects,
      selectedAreaIds: [],
      selectedGoalIds: ["g2"],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      goalToProjectIds,
    });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filters by areas when areas are selected", () => {
    const result = filterProjects({
      allProjects: projects,
      selectedAreaIds: ["a1"],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      goalToProjectIds: buildGoalProjectMaps(goalProjectRelations).goalToProjectIds,
    });
    expect(result.map((p) => p.id)).toEqual(["p1", "p4"]);
  });

  it("tasks take precedence over goals", () => {
    const { goalToProjectIds } = buildGoalProjectMaps(goalProjectRelations);
    const result = filterProjects({
      allProjects: projects,
      selectedAreaIds: [],
      selectedGoalIds: ["g2"], // g2 -> p2
      selectedProjectIds: [],
      selectedTaskIds: ["t1"], // t1 -> p1
      selectedTasks: [tasks[0]],
      goalToProjectIds,
    });
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });
});

// ---------------------------------------------------------------------------
// filterGoals
// ---------------------------------------------------------------------------

describe("filterGoals", () => {
  it("returns all active goals when nothing is selected", () => {
    const result = filterGoals({
      allGoals: goals,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      taskToGoalIds: buildGoalTaskMaps(goalTaskRelations).taskToGoalIds,
      projectToGoalIds: buildGoalProjectMaps(goalProjectRelations).projectToGoalIds,
    });
    expect(result.map((g) => g.id)).toEqual(["g1", "g2", "g4"]);
  });

  it("filters by tasks when tasks are selected", () => {
    const maps = buildGoalTaskMaps(goalTaskRelations);
    const pmaps = buildGoalProjectMaps(goalProjectRelations);
    const result = filterGoals({
      allGoals: goals,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: ["t1"],
      selectedTasks: [tasks[0]], // t1 -> g1 (direct) + t1 has project p1 -> g1, g4
      taskToGoalIds: maps.taskToGoalIds,
      projectToGoalIds: pmaps.projectToGoalIds,
    });
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g4"]));
    expect(result).toHaveLength(2);
  });

  it("filters by projects when projects are selected", () => {
    const pmaps = buildGoalProjectMaps(goalProjectRelations);
    const result = filterGoals({
      allGoals: goals,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: ["p1"],
      selectedTaskIds: [],
      selectedTasks: [],
      taskToGoalIds: buildGoalTaskMaps(goalTaskRelations).taskToGoalIds,
      projectToGoalIds: pmaps.projectToGoalIds,
    });
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g4"]));
    expect(result).toHaveLength(2);
  });

  it("filters by areas when areas are selected", () => {
    const result = filterGoals({
      allGoals: goals,
      selectedAreaIds: ["a2"],
      selectedGoalIds: [],
      selectedProjectIds: [],
      selectedTaskIds: [],
      selectedTasks: [],
      taskToGoalIds: buildGoalTaskMaps(goalTaskRelations).taskToGoalIds,
      projectToGoalIds: buildGoalProjectMaps(goalProjectRelations).projectToGoalIds,
    });
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g2", "g4"]));
    expect(result).toHaveLength(2);
  });

  it("tasks take precedence over projects", () => {
    const maps = buildGoalTaskMaps(goalTaskRelations);
    const pmaps = buildGoalProjectMaps(goalProjectRelations);
    const result = filterGoals({
      allGoals: goals,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: ["p2"], // g2
      selectedTaskIds: ["t1"],    // g1 (+ g4 via project)
      selectedTasks: [tasks[0]],
      taskToGoalIds: maps.taskToGoalIds,
      projectToGoalIds: pmaps.projectToGoalIds,
    });
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g4"]));
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// filterTasks
// ---------------------------------------------------------------------------

describe("filterTasks", () => {
  it("returns all tasks when nothing is selected", () => {
    const result = filterTasks({
      allTasks: tasks,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: [],
      goalToTaskIds: buildGoalTaskMaps(goalTaskRelations).goalToTaskIds,
    });
    expect(result).toHaveLength(4);
  });

  it("filters by goals when goals are selected", () => {
    const { goalToTaskIds } = buildGoalTaskMaps(goalTaskRelations);
    const result = filterTasks({
      allTasks: tasks,
      selectedAreaIds: [],
      selectedGoalIds: ["g1"],
      selectedProjectIds: [],
      goalToTaskIds,
    });
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters by projects when projects are selected", () => {
    const result = filterTasks({
      allTasks: tasks,
      selectedAreaIds: [],
      selectedGoalIds: [],
      selectedProjectIds: ["p1"],
      goalToTaskIds: buildGoalTaskMaps(goalTaskRelations).goalToTaskIds,
    });
    expect(result.map((t) => t.id)).toEqual(["t1", "t3"]);
  });

  it("filters by areas when areas are selected", () => {
    const result = filterTasks({
      allTasks: tasks,
      selectedAreaIds: ["a1"],
      selectedGoalIds: [],
      selectedProjectIds: [],
      goalToTaskIds: buildGoalTaskMaps(goalTaskRelations).goalToTaskIds,
    });
    expect(result.map((t) => t.id)).toEqual(["t1", "t3"]);
  });

  it("goals take precedence over projects", () => {
    const { goalToTaskIds } = buildGoalTaskMaps(goalTaskRelations);
    const result = filterTasks({
      allTasks: tasks,
      selectedAreaIds: [],
      selectedGoalIds: ["g1"], // t1
      selectedProjectIds: ["p1"], // t1, t3
      goalToTaskIds,
    });
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });
});

// ---------------------------------------------------------------------------
// cleanInvalidSelections
// ---------------------------------------------------------------------------

describe("cleanInvalidSelections", () => {
  it("returns same ids when all selections are valid", () => {
    const filtered = computeFilteredOptions(makeInputs());
    const result = cleanInvalidSelections(
      { selectedAreaIds: ["a1"], selectedGoalIds: ["g1"], selectedProjectIds: ["p1"], selectedTaskIds: ["t1"] },
      filtered,
    );
    expect(result.changed).toBe(false);
    expect(result.areaIds).toEqual(["a1"]);
    expect(result.goalIds).toEqual(["g1"]);
    expect(result.projectIds).toEqual(["p1"]);
    expect(result.taskIds).toEqual(["t1"]);
  });

  it("removes area ids that are not in visible areas", () => {
    const filtered = computeFilteredOptions(makeInputs({ selectedTaskIds: ["t1"] })); // t1 -> a1 only
    const result = cleanInvalidSelections(
      { selectedAreaIds: ["a1", "a2"], selectedGoalIds: [], selectedProjectIds: [], selectedTaskIds: ["t1"] },
      filtered,
    );
    expect(result.changed).toBe(true);
    expect(result.areaIds).toEqual(["a1"]);
  });

  it("removes goal ids that are not in filtered goals", () => {
    const filtered = computeFilteredOptions(makeInputs({ selectedAreaIds: ["a2"] })); // a2 -> g2, g4
    const result = cleanInvalidSelections(
      { selectedAreaIds: ["a2"], selectedGoalIds: ["g1", "g2"], selectedProjectIds: [], selectedTaskIds: [] },
      filtered,
    );
    expect(result.changed).toBe(true);
    expect(result.goalIds).toEqual(["g2"]);
  });

  it("removes project ids that are not in filtered projects", () => {
    const filtered = computeFilteredOptions(makeInputs({ selectedGoalIds: ["g1"] })); // g1 -> p1
    const result = cleanInvalidSelections(
      { selectedAreaIds: [], selectedGoalIds: ["g1"], selectedProjectIds: ["p1", "p2"], selectedTaskIds: [] },
      filtered,
    );
    expect(result.changed).toBe(true);
    expect(result.projectIds).toEqual(["p1"]);
  });

  it("removes task ids that are not in filtered tasks", () => {
    const filtered = computeFilteredOptions(makeInputs({ selectedGoalIds: ["g1"] })); // g1 -> t1
    const result = cleanInvalidSelections(
      { selectedAreaIds: [], selectedGoalIds: ["g1"], selectedProjectIds: [], selectedTaskIds: ["t1", "t2"] },
      filtered,
    );
    expect(result.changed).toBe(true);
    expect(result.taskIds).toEqual(["t1"]);
  });

  it("handles empty selections without error", () => {
    const filtered = computeFilteredOptions(makeInputs());
    const result = cleanInvalidSelections(
      { selectedAreaIds: [], selectedGoalIds: [], selectedProjectIds: [], selectedTaskIds: [] },
      filtered,
    );
    expect(result.changed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeFilteredOptions (integration)
// ---------------------------------------------------------------------------

describe("computeFilteredOptions", () => {
  it("returns all active entities when nothing is selected", () => {
    const result = computeFilteredOptions(makeInputs());
    expect(result.visibleAreas.map((a) => a.id)).toEqual(["a1", "a2", "a4"]);
    expect(result.filteredGoals.map((g) => g.id)).toEqual(["g1", "g2", "g4"]);
    expect(result.filteredProjects.map((p) => p.id)).toEqual(["p1", "p2", "p4"]);
    expect(result.filteredTasks.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("filters everything correctly when tasks are selected", () => {
    const result = computeFilteredOptions(makeInputs({ selectedTaskIds: ["t1"] }));
    // t1 -> a1
    expect(result.visibleAreas.map((a) => a.id)).toEqual(["a1"]);
    // t1 -> p1
    expect(result.filteredProjects.map((p) => p.id)).toEqual(["p1"]);
    // t1 -> g1 (direct) + g1 -> p1 -> g4
    expect(result.filteredGoals.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g4"]));
    // No goals are explicitly selected, so all tasks remain (filter is input-driven, not cascading)
    expect(result.filteredTasks).toHaveLength(4);
  });

  it("filters everything correctly when goals are selected", () => {
    const result = computeFilteredOptions(makeInputs({ selectedGoalIds: ["g1"] }));
    // g1 -> a1
    expect(result.visibleAreas.map((a) => a.id)).toEqual(["a1"]);
    // g1 -> p1
    expect(result.filteredProjects.map((p) => p.id)).toEqual(["p1"]);
    // No filter on goals when only goals are selected — all active goals remain
    expect(result.filteredGoals.map((g) => g.id)).toEqual(["g1", "g2", "g4"]);
    // g1 -> t1
    expect(result.filteredTasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters everything correctly when areas are selected", () => {
    const result = computeFilteredOptions(makeInputs({ selectedAreaIds: ["a2"] }));
    // No filter on areas when only areas are selected — all active areas remain
    expect(result.visibleAreas.map((a) => a.id)).toEqual(["a1", "a2", "a4"]);
    // a2 -> g2, g4
    expect(result.filteredGoals.map((g) => g.id)).toEqual(expect.arrayContaining(["g2", "g4"]));
    // a2 -> p2, p4
    expect(result.filteredProjects.map((p) => p.id)).toEqual(expect.arrayContaining(["p2", "p4"]));
    // a2 -> t2
    expect(result.filteredTasks.map((t) => t.id)).toEqual(["t2"]);
  });

  it("excludes archived entities from results", () => {
    const result = computeFilteredOptions(makeInputs());
    expect(result.visibleAreas.some((a) => a.id === "a3")).toBe(false);
    expect(result.filteredGoals.some((g) => g.id === "g3")).toBe(false);
    expect(result.filteredProjects.some((p) => p.id === "p3")).toBe(false);
  });
});
