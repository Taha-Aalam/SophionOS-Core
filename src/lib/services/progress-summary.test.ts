import { describe, it, expect } from "vitest"
import type { Goal, Project } from "@/lib/types/domain.types"

import { mapGoalProgressSummary, type GoalProgressSummaryRow } from "./goal.service"
import { mapProjectProgressSummary, type ProjectProgressSummaryRow } from "./project.service"

// These cover the mapping layer between the new SQL aggregation RPCs
// (goal_progress_summary / project_progress_summary) and the rollup count
// fields the UI reads. The RPC does the counting; the mapper must place each
// per-id row onto the matching entity and degrade unmatched entities to zero.

function makeGoal(id: string): Goal {
  return { id } as unknown as Goal
}
function makeProject(id: string): Project {
  return { id } as unknown as Project
}

describe("mapGoalProgressSummary", () => {
  it("maps each RPC row onto the matching goal's rollup counts", () => {
    const goals = [makeGoal("g1"), makeGoal("g2")]
    const rows: GoalProgressSummaryRow[] = [
      {
        goal_id: "g1",
        active_project_count: 2,
        active_task_count: 5,
        active_note_count: 1,
        active_resource_count: 3,
      },
      {
        goal_id: "g2",
        active_project_count: 0,
        active_task_count: 7,
        active_note_count: 4,
        active_resource_count: 0,
      },
    ]

    const result = mapGoalProgressSummary(goals, rows)

    expect(result[0]).toMatchObject({
      id: "g1",
      projectCount: 2,
      taskCount: 5,
      noteCount: 1,
      resourceCount: 3,
    })
    expect(result[1]).toMatchObject({
      id: "g2",
      projectCount: 0,
      taskCount: 7,
      noteCount: 4,
      resourceCount: 0,
    })
  })

  it("degrades a goal with no RPC row to zero counts", () => {
    const goals = [makeGoal("g1"), makeGoal("missing")]
    const rows: GoalProgressSummaryRow[] = [
      {
        goal_id: "g1",
        active_project_count: 1,
        active_task_count: 1,
        active_note_count: 1,
        active_resource_count: 1,
      },
    ]

    const result = mapGoalProgressSummary(goals, rows)

    expect(result[1]).toMatchObject({
      id: "missing",
      projectCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    })
  })

  it("treats a null RPC result as all-zero", () => {
    const result = mapGoalProgressSummary([makeGoal("g1")], null)
    expect(result[0]).toMatchObject({
      projectCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    })
  })
})

describe("mapProjectProgressSummary", () => {
  it("maps RPC counts and preserves the separately-computed goalCount", () => {
    const projects = [makeProject("p1"), makeProject("p2")]
    const rows: ProjectProgressSummaryRow[] = [
      { project_id: "p1", active_task_count: 4, active_note_count: 2, active_resource_count: 1 },
      { project_id: "p2", active_task_count: 0, active_note_count: 0, active_resource_count: 9 },
    ]
    const goalCountByProject = new Map<string, number>([
      ["p1", 3],
      ["p2", 0],
    ])

    const result = mapProjectProgressSummary(projects, rows, goalCountByProject)

    expect(result[0]).toMatchObject({
      id: "p1",
      goalCount: 3,
      taskCount: 4,
      noteCount: 2,
      resourceCount: 1,
    })
    expect(result[1]).toMatchObject({
      id: "p2",
      goalCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 9,
    })
  })

  it("degrades a project with no RPC row to zero counts but keeps goalCount", () => {
    const projects = [makeProject("p1")]
    const goalCountByProject = new Map<string, number>([["p1", 2]])

    const result = mapProjectProgressSummary(projects, [], goalCountByProject)

    expect(result[0]).toMatchObject({
      id: "p1",
      goalCount: 2,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    })
  })

  it("defaults goalCount to zero when the project is absent from the map", () => {
    const result = mapProjectProgressSummary([makeProject("p1")], null, new Map())
    expect(result[0]).toMatchObject({
      goalCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    })
  })
})
