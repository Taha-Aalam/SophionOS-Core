/**
 * Knowledge, Contacts, and System MCP tools.
 *
 * Notes/Resources/Topics + Knowledge-Hub search, Contacts (with role linking
 * and interaction logging), and the Dashboard/My-Day/Inbox aggregates.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SophionOSClient } from "../client.js";
import { jsonResult, runTool, type ToolTextResult } from "../utils.js";

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
        "Create a Note. Optionally attach content, a type, link to a topic/project/area/goal, or place it in one or more notebooks. To 'relate' notes, put them in a shared notebook (related-notes are derived, not explicitly linked).",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Note title."),
        content: z.string().optional(),
        type: z.string().optional().describe("Free-text type; defaults to 'note'."),
        status: z.string().optional(),
        topic_id: z.string().optional(),
        project_id: z.string().optional(),
        project_ids: z.array(z.string()).optional(),
        area_id: z.string().optional(),
        area_ids: z.array(z.string()).optional(),
        goal_ids: z.array(z.string()).optional(),
        notebooks: z
          .array(z.string())
          .optional()
          .describe("Notebook names this note belongs to."),
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
        "Save a Resource — typically a URL/article/reference. Optionally set type, link to a topic/area/project, or mark favorite.",
      inputSchema: {
        name: z.string().min(1).max(255),
        url: z.string().optional().describe("http(s) URL."),
        type: z.string().optional().describe("Defaults to 'website'."),
        status: z.string().optional(),
        topic_id: z.string().optional(),
        area_id: z.string().optional(),
        area_ids: z.array(z.string()).optional(),
        project_id: z.string().optional(),
        project_ids: z.array(z.string()).optional(),
        goal_ids: z.array(z.string()).optional(),
        favorite: z.boolean().optional(),
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
        "Create a Topic. Optionally link to areas, and seed it with notes or resources.",
      inputSchema: {
        name: z.string().min(1).max(255),
        area_ids: z.array(z.string()).optional(),
        note_ids: z.array(z.string()).optional(),
        resource_ids: z.array(z.string()).optional(),
        favorite: z.boolean().optional(),
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
        "Create a Contact (a person in the user's professional network). Optionally set role, organization, group, contact channels, and a follow-up interval.",
      inputSchema: {
        name: z.string().min(1).max(255),
        role: z.string().optional(),
        organization: z.string().optional(),
        group: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        linkedin: z.string().optional(),
        website: z.string().optional(),
        follow_up_interval_days: z.number().int().min(0).max(365).optional(),
        notes: z.string().optional(),
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
        "Get the dashboard 'today' payload: today's tasks, focus items, overdue tasks, active goals, and stats.",
      inputSchema: {},
    },
    async (): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.dashboard.today())),
  );

  server.registerTool(
    "get_my_day",
    {
      title: "Get My Day",
      description: "Get the user's focused tasks for the day (is_focused tasks).",
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
      description: "Archive multiple notes at once by id.",
      inputSchema: {
        ids: z.array(z.string()).min(1).describe("Note ids to archive."),
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
        "Permanently delete multiple notes at once by id. Irreversible — prefer bulk_archive_notes to merely hide them.",
      inputSchema: {
        ids: z.array(z.string()).min(1).describe("Note ids to delete."),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ ids }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.bulkDelete(ids))),
  );

  server.registerTool(
    "bulk_update_note_status",
    {
      title: "Bulk Update Note Status",
      description:
        "Set the status of multiple notes at once (e.g. inbox, to_review, active, completed, archive).",
      inputSchema: {
        ids: z.array(z.string()).min(1),
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
