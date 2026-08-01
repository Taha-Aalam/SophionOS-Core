/**
 * Knowledge, Contacts, and System MCP tools.
 *
 * Notes/Resources/Topics + Knowledge-Hub search, Contacts (with role linking
 * and interaction logging), and the Dashboard/My-Day/Inbox aggregates.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SophionOSClient } from "../client.js";
import {
  bulkIdsField,
  jsonResult,
  requireDestructiveConfirm,
  runTool,
  type ToolTextResult,
} from "../utils.js";

export function registerKnowledgeTools(
  server: McpServer,
  client: SophionOSClient,
): void {
  // ---- NOTES --------------------------------------------------------------

  server.registerTool(
    "list_notes",
    {
      title: "List Notes",
      description:
        "List the user's Notes. Filter by notebook, topic, project, area, status, type, favorite, or pinned. Use group_by=notebook|status|type to group. A note can belong to multiple notebooks.",
      inputSchema: {
        notebook: z.string().optional(),
        topic_id: z.string().optional(),
        project_id: z.string().optional(),
        area_id: z.string().optional(),
        goal_id: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        favorite: z.boolean().optional(),
        pinned: z.boolean().optional(),
        group_by: z.enum(["notebook", "status", "type"]).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.list(args))),
  );

  server.registerTool(
    "get_note",
    {
      title: "Get Note",
      description: "Get a single note with its full content. Accepts id or slug.",
      inputSchema: { id: z.string() },
    },
    async ({ id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.get(id))),
  );

  server.registerTool(
    "create_note",
    {
      title: "Create Note",
      description:
        "Create a Note. Before creating, capture the substance of the conversation as the note's content (a note is pointless without its body — if the user gives only a title, ask what the note should contain). Assign a sensible type derived from the content (consult the catalog via list_note_types; e.g. meeting, idea, research, reference) instead of leaving the default. Then ask the user before creating: whether to link the note to a topic (call list_topics and present the results as choices), areas (list_areas), goals (list_goals), projects (list_projects), or tasks (list_tasks); which notebook(s) to file it in (call list_notebooks and present the results as multi-select choices — notebook membership is what derives related-notes); and whether to mark it as favorite and/or pinned, as a single multiple-select question. Only proceed with defaults for a field when the user explicitly declines or gives no signal.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(255)
          .describe("Note title."),
        content: z
          .string()
          .optional()
          .describe(
            "The substance of the note — capture what the user wants recorded. If they gave only a title, ask what the note should contain.",
          ),
        type: z
          .string()
          .optional()
          .describe(
            "Type derived from the note's content; consult the catalog via list_note_types (e.g. meeting, idea, research, reference). Defaults to 'note' only when the content gives no signal.",
          ),
        topic_id: z
          .string()
          .optional()
          .describe(
            "Topic id to link. Offer to link an existing topic by listing them via list_topics and asking the user.",
          ),
        area_id: z.string().optional(),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        goal_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Goal ids to link. Offer to link existing goals by listing them via list_goals and asking the user.",
          ),
        project_id: z.string().optional(),
        project_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Project ids to link. Offer to link existing projects by listing them via list_projects and asking the user.",
          ),
        task_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Task ids to link. Offer to link existing tasks by listing them via list_tasks and asking the user.",
          ),
        notebooks: z
          .array(z.string())
          .optional()
          .describe(
            "Notebook names this note belongs to. Ask the user which notebook(s) to file it in, presenting existing notebooks via list_notebooks as multi-select choices. Shared notebooks derive related-notes.",
          ),
        favorite: z
          .boolean()
          .optional()
          .describe(
            "Ask whether to mark the note as favorite and/or pinned in a single multiple-select question before creating.",
          ),
        pin: z
          .boolean()
          .optional()
          .describe(
            "Ask whether to mark the note as favorite and/or pinned in a single multiple-select question before creating.",
          ),
        status: z.string().optional().describe("Note status."),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.create(args))),
  );

  server.registerTool(
    "update_note",
    {
      title: "Update Note",
      description:
        "Update a note's name, content, type, status, topic, or favorite/pin flags.",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        topic_id: z.string().nullable().optional(),
        favorite: z.boolean().optional(),
        pin: z.boolean().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.update(id, body))),
  );

  // ---- RESOURCES ----------------------------------------------------------

  server.registerTool(
    "save_resource",
    {
      title: "Save Resource",
      description:
        "Save a Resource — a saved reference (URL/article/video/tool). Resolve the url first: it is what makes a resource a resource. If the user did not give a URL explicitly, scan the conversation for links they shared or that were referenced, present the found link and ask 'Is this the URL you want to attach?', and offer a free-text input for a different URL — only proceed with the URL the user confirms. Assign a sensible type derived from the resource (e.g. article, video, document, tool) instead of leaving the default 'website'. Then ask the user before creating: whether to link the resource to a topic (call list_topics and present the results as choices), areas (list_areas), goals (list_goals), projects (list_projects), or tasks (list_tasks); and whether to mark it as favorite. Only proceed with defaults for a field when the user explicitly declines or gives no signal.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Resource name."),
        url: z
          .string()
          .optional()
          .describe(
            "http(s) URL of the resource. Required in practice: if the user did not give one, scan the conversation for the link they shared, show it, and ask them to confirm it (or type a different one) before creating.",
          ),
        type: z
          .string()
          .optional()
          .describe(
            "Type derived from the resource (e.g. article, video, document, tool). Available catalog: website, article, video, document, podcast, social_media, tool. Defaults to 'website' only when nothing else fits.",
          ),
        topic_id: z
          .string()
          .optional()
          .describe(
            "Topic id to link. Offer to link an existing topic by listing them via list_topics and asking the user.",
          ),
        area_id: z.string().optional(),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        goal_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Goal ids to link. Offer to link existing goals by listing them via list_goals and asking the user.",
          ),
        project_id: z.string().optional(),
        project_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Project ids to link. Offer to link existing projects by listing them via list_projects and asking the user.",
          ),
        task_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Task ids to link. Offer to link existing tasks by listing them via list_tasks and asking the user.",
          ),
        favorite: z
          .boolean()
          .optional()
          .describe(
            "Ask the user whether to mark the resource as favorite before creating.",
          ),
        status: z.string().optional().describe("Resource status."),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.resources.create(args))),
  );

  server.registerTool(
    "list_resources",
    {
      title: "List Resources",
      description:
        "List the user's Resources. Filter by status, type, area, topic, project, or favorite. Use group_by to group results.",
      inputSchema: {
        status: z.string().optional(),
        type: z.string().optional(),
        favorite: z.boolean().optional(),
        area_id: z.string().optional(),
        topic_id: z.string().optional(),
        project_id: z.string().optional(),
        goal_id: z.string().optional(),
        group_by: z.string().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.resources.list(args))),
  );

  // ---- TOPICS -------------------------------------------------------------

  server.registerTool(
    "list_topics",
    {
      title: "List Topics",
      description:
        "List the user's Topics (knowledge tags grouping notes and resources). Use grouped=true to group by area, or filter by archived/favorite/inactive.",
      inputSchema: {
        grouped: z.boolean().optional(),
        archive: z.boolean().optional(),
        favorite: z.boolean().optional(),
        inactive: z.boolean().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.topics.list(args))),
  );

  server.registerTool(
    "create_topic",
    {
      title: "Create Topic",
      description:
        "Create a Topic (a knowledge tag grouping notes and resources). Topics have no description field, so ensure the name is clear and descriptive: if the user's name is vague or the request ambiguous, propose a more precise name for confirmation before creating (e.g. 'AI Notes' -> 'AI Research Notes'). Then ask the user before creating: whether to link the topic to areas (call list_areas and present the results as choices), whether to seed it with existing notes (call list_notes and present the results as multi-select choices), whether to seed it with existing resources (call list_resources and present the results as multi-select choices), and whether to mark it as favorite. Only proceed with defaults for a field when the user explicitly declines or gives no signal.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(255)
          .describe(
            "Topic name. Make it clear and descriptive; if the user's name is vague, propose a more precise one (e.g. 'AI Notes' -> 'AI Research Notes') and confirm before creating.",
          ),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        note_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Notes to seed the topic with. Offer to seed with existing notes by listing them via list_notes as multi-select choices.",
          ),
        resource_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Resources to seed the topic with. Offer to seed with existing resources by listing them via list_resources as multi-select choices.",
          ),
        favorite: z
          .boolean()
          .optional()
          .describe(
            "Ask the user whether to mark the topic as favorite before creating.",
          ),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.topics.create(args))),
  );

  // ---- CONTACTS -----------------------------------------------------------

  server.registerTool(
    "list_contacts",
    {
      title: "List Contacts",
      description:
        "List the user's Contacts. Filter by group, favorite, archived, or follow_up=true to surface contacts overdue for follow-up.",
      inputSchema: {
        group: z.string().optional(),
        follow_up: z
          .boolean()
          .optional()
          .describe("Only contacts overdue for follow-up."),
        favorite: z.boolean().optional(),
        archive: z.boolean().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.list(args))),
  );

  server.registerTool(
    "create_contact",
    {
      title: "Create Contact",
      description:
        "Create a Contact (a person in the user's professional network). Email and phone are required — ask the user for both in a single question with a field for each (or take them from the conversation if already stated). Auto-generate a brief note capturing what is known about the contact from the conversation (who they are, how the user knows them) and suggest a role derived from context (e.g. \"Client\", \"Engineer\", \"Reviewer\"). Then ask the user before creating: which organization the contact belongs to (skip if unknown); which group to assign (call get_contact_groups and present existing groups such as Clients/Team/Vendors as choices, or suggest a new one); optional channels LinkedIn and website as a single multi-field question; how often to follow up — selectable options none (0) / weekly (7) / bi-weekly (14) / monthly (30), mapped to follow_up_interval_days; and whether to link the contact to areas (list_areas), goals (list_goals), projects (list_projects, optionally with a role in that project), or tasks (list_tasks, optionally with a role in that task). Only proceed with defaults for a field when the user explicitly declines or gives no signal — except email and phone, which must always be provided.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Contact name."),
        email: z
          .string()
          .describe(
            "Contact email. Required — ask the user for email and phone in a single question with both fields, or take them from the conversation if already stated.",
          ),
        phone: z
          .string()
          .describe(
            "Contact phone. Required — ask the user for email and phone in a single question with both fields, or take them from the conversation if already stated.",
          ),
        notes: z
          .string()
          .optional()
          .describe(
            "Brief note capturing what is known about the contact from the conversation (who they are, how the user knows them, context). Always write one.",
          ),
        role: z
          .string()
          .optional()
          .describe(
            "Role suggested from the conversation context (e.g. \"Client\", \"Engineer\", \"Reviewer\"). Always suggest one.",
          ),
        organization: z
          .string()
          .optional()
          .describe(
            "Organization the contact belongs to. Ask the user; skip only if unknown.",
          ),
        group: z
          .string()
          .optional()
          .describe(
            "Group to assign. Present existing groups via get_contact_groups as choices (e.g. Clients, Team, Vendors), or suggest a new one if none fit.",
          ),
        linkedin: z
          .string()
          .optional()
          .describe(
            "LinkedIn URL. Ask for optional channels (LinkedIn and website) in a single multi-field question.",
          ),
        website: z
          .string()
          .optional()
          .describe(
            "Website URL. Ask for optional channels (LinkedIn and website) in a single multi-field question.",
          ),
        follow_up_interval_days: z
          .number()
          .int()
          .min(0)
          .max(365)
          .optional()
          .describe(
            "Follow-up cadence in days. Ask the user with selectable options: none (0), weekly (7), bi-weekly (14), monthly (30).",
          ),
        area_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Area ids to link. Offer to link existing areas by listing them via list_areas and asking the user.",
          ),
        goal_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Goal ids to link. Offer to link existing goals by listing them via list_goals and asking the user.",
          ),
        project_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Project ids to link. Offer to link existing projects by listing them via list_projects (optionally with a role in that project).",
          ),
        task_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Task ids to link. Offer to link existing tasks by listing them via list_tasks (optionally with a role in that task).",
          ),
      },
    },
    async (args): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.create(args))),
  );

  server.registerTool(
    "log_interaction",
    {
      title: "Log Contact Interaction",
      description:
        "Log an interaction with a contact. With a message it records a log entry and bumps last_interaction_at; without a message it just bumps the timestamp.",
      inputSchema: {
        id: z.string().describe("Contact id."),
        message: z.string().min(1).max(2000).optional(),
      },
    },
    async ({ id, message }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.log(id, message))),
  );

  server.registerTool(
    "link_contact_to_project",
    {
      title: "Link Contact to Project",
      description:
        "Link a contact to a project, optionally with a role (e.g. 'Client', 'Reviewer').",
      inputSchema: {
        id: z.string().describe("Contact id."),
        project_id: z.string(),
        role_in_project: z.string().optional(),
      },
    },
    async ({ id, project_id, role_in_project }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(
          await client.contacts.linkProject(id, project_id, role_in_project),
        ),
      ),
  );

  // ---- SEARCH -------------------------------------------------------------

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Full-text search across the user's entities. Returns matches grouped by type.",
      inputSchema: { q: z.string().min(1).describe("Search query.") },
    },
    async ({ q }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.search(q))),
  );

  server.registerTool(
    "knowledge_search",
    {
      title: "Knowledge Hub Search",
      description:
        "Search the knowledge hub — notes, resources, and topics — simultaneously. Returns grouped results with counts.",
      inputSchema: { q: z.string().min(1).describe("Search query.") },
    },
    async ({ q }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.knowledgeSearch(q))),
  );

  // ---- SYSTEM AGGREGATES --------------------------------------------------

  server.registerTool(
    "get_dashboard",
    {
      title: "Get Dashboard (Today)",
      description:
        "Get the full dashboard payload in one call. Top-level sections: greeting, tasksTodayCount, todayTasks (due-today + focused pending tasks, each with isOverdue), activeGoals, stats (completedThisWeek, activeGoalsCount, overdueCount), recentActivity — and analytics, the same KPIs and graphs as the dashboard page: analytics.kpis (focusTasks, overdueTasks, completedThisWeek, activeGoals), analytics.executionLoad (today, overdue, focus, inProgress, completedThisWeek), analytics.workHealth (overdueByArea, overdueByProject, stalledProjects, lowProgressNearDueGoals, unassignedTasks), analytics.knowledgePipeline (capturedToday, waitingReview, saved, archived, backlog, mostActiveTopics), analytics.goalMomentum (movingGoals, stalledGoals, buckets.stuck/moving/almostDone), analytics.relationshipRisk (followUpsDue, tiedToActiveProjects, contacts with daysOverdue and activeProjectCount), analytics.heatmap (year-long activity graph: days with completed/captured/total counts), analytics.contextNetwork (areaNodes, goalNodes, projectNodes, taskNodes, densityScore). Use this to answer questions about KPIs, trends, workload, goal progress, knowledge intake, or network health.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.dashboard.today())),
  );

  server.registerTool(
    "get_my_day",
    {
      title: "Get My Day",
      description:
        "Get the user's My Day — two sections in one call: dueToday (active tasks due today, with dueTodayCount) and focused (active tasks marked is_focused, with focusedCount). Use this to answer 'what's my day?' or 'what's due today?'. For 'plan my day': list the available tasks (call list_tasks with focused=false or sort=smart-priority to get non-completed, not-yet-focused tasks), present them to the user for multi-select, then mark the chosen ones as focused via update_task with is_focused: true — optionally un-focusing tasks the user drops (update_task with is_focused: false).",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.myDay())),
  );

  server.registerTool(
    "get_inbox",
    {
      title: "Get Inbox",
      description:
        "Get the unified inbox — tasks, notes, and resources currently in 'inbox' status — with counts.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.inbox())),
  );

  // ---- NOTE COLLECTION + BULK ---------------------------------------------

  server.registerTool(
    "list_notebooks",
    {
      title: "List Notebooks",
      description:
        "List all distinct notebook names across the user's notes (for choosing where to file a note).",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.allNotebooks())),
  );

  server.registerTool(
    "list_note_types",
    {
      title: "List Note Types",
      description:
        "List the user's available note types (the type catalog used to categorize notes).",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.types())),
  );

  server.registerTool(
    "bulk_archive_notes",
    {
      title: "Bulk Archive Notes",
      description: "Archive multiple notes at once by id (max 100).",
      inputSchema: {
        ids: bulkIdsField,
      },
      annotations: { idempotentHint: true },
    },
    async ({ ids }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.bulkArchive(ids))),
  );

  server.registerTool(
    "bulk_delete_notes",
    {
      title: "Bulk Delete Notes",
      description:
        "Permanently delete multiple notes (max 100). Irreversible — prefer bulk_archive_notes. Requires confirm: true.",
      inputSchema: {
        ids: bulkIdsField,
        confirm: z
          .boolean()
          .describe("Must be true to proceed with permanent deletion."),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ ids, confirm }): Promise<ToolTextResult> =>
      runTool(async () => {
        requireDestructiveConfirm(confirm);
        return jsonResult(await client.notes.bulkDelete(ids));
      }),
  );

  server.registerTool(
    "bulk_update_note_status",
    {
      title: "Bulk Update Note Status",
      description:
        "Set the status of multiple notes at once (max 100; e.g. inbox, to_review, active, completed, archive).",
      inputSchema: {
        ids: bulkIdsField,
        status: z.string().describe("Target status for all the notes."),
      },
    },
    async ({ ids, status }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.notes.bulkUpdateStatus(ids, status)),
      ),
  );

  // ---- CONTACT LOG HISTORY ------------------------------------------------

  server.registerTool(
    "get_contact_log_history",
    {
      title: "Get Contact Log History",
      description:
        "Get the interaction log history for a contact (most recent first).",
      inputSchema: { contact_id: z.string() },
    },
    async ({ contact_id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.logHistory(contact_id))),
  );

  // ---- CONTACT GROUPINGS + ACTIVITY ---------------------------------------

  server.registerTool(
    "get_contact_groups",
    {
      title: "Get Contact Groups",
      description:
        "List the user's contacts grouped by their group field (e.g. Clients, Team, Vendors).",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.groups())),
  );

  server.registerTool(
    "get_contacts_grouped_by_area",
    {
      title: "Get Contacts Grouped by Area",
      description: "List the user's contacts grouped by their linked areas.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.groupedByArea())),
  );

  server.registerTool(
    "get_contacts_grouped_by_goal",
    {
      title: "Get Contacts Grouped by Goal",
      description: "List the user's contacts grouped by their linked goals.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.groupedByGoal())),
  );

  server.registerTool(
    "get_dashboard_activity",
    {
      title: "Get Dashboard Activity",
      description: "Get the recent activity feed for the dashboard.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.dashboard.activity())),
  );
}
