import { describe, it, expect } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

import { serverFetchDashboardToday } from "./dashboard.queries"

// A chainable, thenable Supabase query-builder stub. Every query method returns
// the same builder, and awaiting the builder resolves (or rejects) with the
// result configured per table. This lets us simulate ONE data source failing
// while the others succeed — the partial-failure case that the allSettled
// refactor (H1) must degrade through instead of throwing.
type StubResult = { data: unknown[] | null; count?: number | null }

function makeClient(
  resultForTable: (table: string) => Promise<StubResult>,
): SupabaseClient {
  const chainMethods = [
    "select",
    "eq",
    "or",
    "order",
    "limit",
    "gte",
    "lt",
    "in",
    "maybeSingle",
    "single",
  ]
  const client = {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {}
      for (const m of chainMethods) builder[m] = () => builder
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder.then = (onFulfilled: any, onRejected: any) =>
        resultForTable(table).then(onFulfilled, onRejected)
      return builder
    },
  }
  return client as unknown as SupabaseClient
}

describe("serverFetchDashboardToday partial-failure degradation", () => {
  it("renders resolved sources and empties the failed source instead of throwing", async () => {
    const taskRow = {
      id: "task-1",
      title: "Resolved task",
      description: null,
      due_date: null,
      priority: "medium",
      status: "pending",
      project_id: null,
      area_id: null,
      projects: [],
      goals: [],
      areas: [],
    }
    const projectRow = {
      id: "project-1",
      name: "Resolved project",
      description: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-02T00:00:00Z",
    }
    const areaRow = {
      id: "area-1",
      name: "Resolved area",
      description: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
    }

    const client = makeClient((table) => {
      // The goals source fails; every other source resolves with data.
      if (table === "goals") return Promise.reject(new Error("goals query failed"))
      if (table === "tasks") return Promise.resolve({ data: [taskRow], count: 3 })
      if (table === "projects") return Promise.resolve({ data: [projectRow] })
      if (table === "areas") return Promise.resolve({ data: [areaRow] })
      // user_settings uses .single() (not an array query). getPreferences
      // reads data.value; simulate "no prefs row" → null return.
      if (table === "user_settings") return Promise.resolve({ data: null, count: 0 })
      return Promise.resolve({ data: [], count: 0 })
    })

    // Fail-fast Promise.all would reject here; allSettled must resolve.
    const result = await serverFetchDashboardToday(client, "user-1")

    // Failed source degrades to empty/zero.
    expect(result.activeGoals).toEqual([])
    expect(result.stats.activeGoalsCount).toBe(0)

    // Resolved sources still populate.
    expect(result.stats.completedThisWeek).toBe(3)
    expect(result.stats.overdueCount).toBe(3)
    expect(result.todayTasks).toHaveLength(1)
    expect(result.todayTasks[0].id).toBe("task-1")

    // Recent activity includes the resolved entity types but not the failed one.
    const activityTypes = result.recentActivity.map((a) => a.entityType)
    expect(activityTypes).toContain("task")
    expect(activityTypes).toContain("project")
    expect(activityTypes).toContain("area")
    expect(activityTypes).not.toContain("goal")
  })

  it("returns a well-formed shell when every source fails", async () => {
    const client = makeClient((table) => {
      if (table === "user_settings") return Promise.resolve({ data: null, count: 0 })
      return Promise.reject(new Error("total outage"))
    })

    const result = await serverFetchDashboardToday(client, "user-1")

    expect(result.todayTasks).toEqual([])
    expect(result.activeGoals).toEqual([])
    expect(result.recentActivity).toEqual([])
    expect(result.stats).toEqual({
      completedThisWeek: 0,
      activeGoalsCount: 0,
      overdueCount: 0,
    })
    expect(typeof result.greeting).toBe("string")
  })
})
