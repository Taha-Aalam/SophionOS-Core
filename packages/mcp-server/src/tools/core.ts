/**
 * Core PARA MCP tools — Areas, Goals, Projects, Tasks.
 *
 * Tool descriptions are written for model consumption: they state when to use
 * the tool and how verbs map onto the shipped REST endpoints (which lack some
 * of the convenience routes the roadmap originally imagined).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SophionOSClient } from "../client.js";
import {
  bulkIdsField,
  jsonResult,
  runTool,
  type ToolTextResult,
} from "../utils.js";

export function registerCoreTools(
  server: McpServer,
  client: SophionOSClient,
): void {
  // ---- AREAS --------------------------------------------------------------

  server.registerTool(
    "list_areas",
    {
      title: "List Areas",
      description:
        "List the user's PARA Areas (life/work domains such as Health, Work, Finances). Use ?grouped to group by type, or filter by inactive/archived state. Returns a paginated list.",
      inputSchema: {
        grouped: z.boolean().optional().describe("Group areas by their type."),
        inactive: z
          .boolean()
          .optional()
          .describe("Include only areas with no active linked items."),
        archive: z
          .boolean()
          .optional()
          .describe("Return archived areas instead of active ones."),
        type: z.string().optional().describe("Filter by area type name."),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.areas.list(args))),
  );

  server.registerTool(
    "create_area",
    {
      title: "Create Area",
      description:
        "Create a new PARA Area. An area is a broad ongoing life or work domain (not a one-off task). Provide a name and always populate icon, color, type, and description with values derived from the name: icon is a single emoji that fits the domain (e.g. Health -> \u{1F3C3}, Finances -> \u{1F4B0}, Test Area -> \u{1F9EA}), color is a hex color matching the domain's theme, type is a meaningful classification (e.g. \"Personal\", \"Business\"), and description is a brief one-liner of what the area covers.",
      inputSchema: {
        name: z.string().min(1).max(100).describe("Area name."),
        icon: z
          .string()
          .optional()
          .describe(
            'Single emoji representing the domain, derived from the area name (e.g. "Health" -> \u{1F3C3}, "Finances" -> \u{1F4B0}). Always pick one for the area name.',
          ),
        color: z
          .string()
          .optional()
          .describe(
            'Hex color matching the area\'s theme, derived from the area name (e.g. "#22c55e" for Health, "#f59e0b" for Finances). Always pick one for the area name.',
          ),
        type: z
          .string()
          .optional()
          .describe(
            'Meaningful area type derived from the name/context, e.g. "Personal", "Business" (e.g. "Health" -> "Personal", "Test Area" -> "Business"). Defaults to Personal only when the name gives no signal.',
          ),
        description: z
          .string()
          .optional()
          .describe(
            "Brief one-liner of what the area covers, derived from the area name (e.g. \"Test Area\" -> \"Area for validating the system.\"). Always write one for the area name.",
          ),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.areas.create(args))),
  );

  server.registerTool(
    "archive_area",
    {
      title: "Archive Area",
      description:
        "Archive an area (user-initiated, moves it to long-term storage). Distinct from auto-inactive, which is computed from linked items.",
      inputSchema: { id: z.string().describe("Area id or slug.") },
      annotations: { idempotentHint: true },
    },
    async ({ id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.areas.archive(id))),
  );

  server.registerTool(
    "restore_area",
    {
      title: "Restore Area",
      description:
        "Restore an archived area. Its active/inactive state is then recomputed from its linked items.",
      inputSchema: { id: z.string().describe("Area id or slug.") },
      annotations: { idempotentHint: true },
    },
    async ({ id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.areas.restore(id))),
  );

  // ---- GOALS --------------------------------------------------------------

  server.registerTool(
    "list_goals",
    {
      title: "List Goals",
      description:
        "List the user's Goals. Filter by term (short/mid/long), status, area, or priority. Returns a paginated list.",
      inputSchema: {
        term: z
          .enum(["short", "mid", "long"])
          .optional()
          .describe("Goal time horizon."),
        status: z.string().optional(),
        area_id: z.string().optional(),
        priority: z.string().optional(),
        completed: z.boolean().optional(),
        archive: z.boolean().optional(),
        inactive: z.boolean().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.goals.list(args))),
  );

  server.registerTool(
    "get_goal_detail",
    {
      title: "Get Goal Detail",
      description:
        "Get a single goal with its hydrated progress and rollup counts (its 'command center' view). Accepts a goal id or slug.",
      inputSchema: { id: z.string().describe("Goal id or slug.") },
    },
    async ({ id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.goals.get(id))),
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create Goal",
      description:
        "Create a new Goal. Requires a name and a term (short/mid/long). Before creating, enrich the goal with input from the user: always write a brief, meaningful description derived from the goal name; ask the user to choose the term (short/mid/long) instead of defaulting to short; ask the user to pick a priority (low/medium/high) instead of defaulting to medium; ask whether they want to link the goal to any of their existing areas (call list_areas and present the results as choices); and ask for an optional target date. Only proceed with defaults for a field when the user explicitly declines or gives no signal.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(100)
          .describe("Goal name."),
        term: z
          .enum(["short", "mid", "long"])
          .describe(
            "Time horizon. Ask the user to choose from short/mid/long before creating; do not silently default.",
          ),
        priority: z
          .string()
          .optional()
          .describe(
            "Priority (low/medium/high). Ask the user to choose before creating; do not silently default to medium.",
          ),
        area_id: z
          .string()
          .optional()
          .describe(
            "Single area id to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Multiple area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        description: z
          .string()
          .optional()
          .describe(
            "Brief, meaningful description of the goal, derived from the goal name. Always write one.",
          ),
        target_date: z
          .string()
          .optional()
          .describe(
            "ISO date; must be in the future. Ask the user for the target completion date; skip only if they decline.",
          ),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.goals.create(args))),
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update Goal",
      description:
        "Update fields on an existing goal (name, description, priority, term, target_date, progress, completion/archive flags).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        priority: z.string().optional(),
        term: z.enum(["short", "mid", "long"]).optional(),
        target_date: z.string().optional(),
        progress: z.number().optional(),
        is_completed: z.boolean().optional(),
        is_archived: z.boolean().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.goals.update(id, body))),
  );

  // ---- PROJECTS -----------------------------------------------------------

  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description:
        "List the user's Projects. Filter by status (including 'inbox'), area, goal, or linked contact. Use group_by to group by area or status. Returns a paginated list.",
      inputSchema: {
        status: z.string().optional(),
        area_id: z.string().optional(),
        goal_id: z.string().optional(),
        contact_id: z.string().optional(),
        archive: z.boolean().optional(),
        group_by: z.enum(["area", "status"]).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.projects.list(args))),
  );

  server.registerTool(
    "get_project",
    {
      title: "Get Project",
      description:
        "Get a single project with its relations and progress (task count, linked areas/goals/contacts).",
      inputSchema: { id: z.string().describe("Project id or slug.") },
    },
    async ({ id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.projects.get(id))),
  );

  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a new Project (a time-bound effort with an outcome). Before creating, enrich the project with input from the user: always write a brief, meaningful description derived from the project name; ask the user to pick a priority (low/medium/high) instead of silently defaulting to medium; ask whether they want to link the project to any of their existing areas (call list_areas and present the results as choices); ask whether they want to link it to any of their existing goals (call list_goals and present the results as choices); and ask for an optional start date and optional due date. Only proceed with defaults for a field when the user explicitly declines or gives no signal.",
      inputSchema: {
        name: z.string().min(1).max(100).describe("Project name."),
        priority: z
          .string()
          .optional()
          .describe(
            "Priority (low/medium/high). Ask the user to choose before creating; do not silently default to medium.",
          ),
        area_id: z
          .string()
          .optional()
          .describe(
            "Single area id to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Multiple area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        goal_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Goal ids to link. Offer to link existing goals by listing them via list_goals and asking the user.",
          ),
        description: z
          .string()
          .optional()
          .describe(
            "Brief, meaningful description of the project, derived from the project name. Always write one.",
          ),
        status: z.string().optional().describe("Project status."),
        start_date: z
          .string()
          .optional()
          .describe(
            "ISO date. Ask the user for the start date; skip only if they decline.",
          ),
        due_date: z
          .string()
          .optional()
          .describe(
            "ISO date; not in the past. Ask the user for the due date; skip only if they decline.",
          ),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.projects.create(args))),
  );

  server.registerTool(
    "update_project",
    {
      title: "Update Project",
      description:
        "Update fields on an existing project (name, description, status, priority, dates, progress).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        start_date: z.string().optional(),
        due_date: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.projects.update(id, body))),
  );

  // ---- TASKS --------------------------------------------------------------

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description:
        "List the user's Tasks. Rich filtering: status, priority, area/project/goal/contact, focused, overdue, upcoming, due-date range. Pass sort='smart-priority' to order by the smart-priority score (most important first).",
      inputSchema: {
        status: z.string().optional(),
        priority: z.string().optional(),
        area_id: z.string().optional(),
        project_id: z.string().optional(),
        goal_id: z.string().optional(),
        contact_id: z.string().optional(),
        focused: z.boolean().optional(),
        overdue: z.boolean().optional(),
        upcoming: z.boolean().optional(),
        due_date_from: z.string().optional(),
        due_date_to: z.string().optional(),
        sort: z
          .string()
          .optional()
          .describe("Use 'smart-priority' to sort by importance."),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.tasks.list(args))),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description:
        "Create a new Task. Optionally link to areas/projects/goals, set priority, due date, focus/important flags, or recurrence (recurring tasks require due_date + repeat_every + repeat_cycle).",
      inputSchema: {
        name: z.string().min(1).max(255),
        area_id: z.string().optional(),
        area_ids: z.array(z.string()).optional(),
        project_id: z.string().optional(),
        project_ids: z.array(z.string()).optional(),
        goal_ids: z.array(z.string()).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional().describe("Defaults to medium."),
        due_date: z.string().optional().describe("ISO date; in the future."),
        is_focused: z.boolean().optional(),
        is_important: z.boolean().optional(),
        is_urgent: z.boolean().optional(),
        is_recurring: z.boolean().optional(),
        repeat_every: z.number().int().optional(),
        repeat_cycle: z.string().optional().describe("e.g. day/week/month."),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.tasks.create(args))),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update Task",
      description:
        "Update fields on an existing task. Use this to toggle focus ({is_focused}), change status, priority, due date, or rename. To mark a task done, prefer complete_task.",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        due_date: z.string().optional(),
        is_focused: z.boolean().optional(),
        is_important: z.boolean().optional(),
        is_urgent: z.boolean().optional(),
        is_completed: z.boolean().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.tasks.update(id, body))),
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete Task",
      description:
        "Mark one or more tasks as complete (max 100). Completing a task updates its parent project's progress.",
      inputSchema: {
        ids: bulkIdsField,
      },
      annotations: { idempotentHint: true },
    },
    async ({ ids }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.tasks.bulkComplete(ids))),
  );
}
