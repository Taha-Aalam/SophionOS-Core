/**
 * Deviation-coverage MCP tools — the as-built capabilities that the curated
 * Step 30/31 tool set didn't surface: notebook membership (multi-value
 * junction), derived related-notes, post-hoc junction linking, per-entity
 * archive/restore, and the remaining update verbs.
 *
 * Several tools are "entity-typed": one tool dispatches across entity kinds via
 * a lookup table, instead of N near-identical tools. This keeps the tool count
 * (and the model's tool-selection burden) low while covering every junction.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { LifeOSClient } from "../client.js";
import { jsonResult, runTool, type ToolTextResult } from "../utils.js";

type AreaLinkable = {
  linkArea: (id: string, area_id: string) => Promise<unknown>;
  unlinkArea: (id: string, area_id: string) => Promise<unknown>;
};
type ArchiveRestorable = {
  archive: (id: string) => Promise<unknown>;
  restore: (id: string) => Promise<unknown>;
};

export function registerLinkTools(
  server: McpServer,
  client: LifeOSClient,
): void {
  // Entities that support area junctions.
  const areaLinkers: Record<string, AreaLinkable> = {
    task: client.tasks,
    goal: client.goals,
    project: client.projects,
    note: client.notes,
    resource: client.resources,
  };

  // Entities with archive/restore actions (areas have their own dedicated
  // archive_area/restore_area tools, so they're intentionally omitted here).
  const archivers: Record<string, ArchiveRestorable> = {
    goal: client.goals,
    project: client.projects,
    task: client.tasks,
    note: client.notes,
    resource: client.resources,
    topic: client.topics,
    contact: client.contacts,
  };

  const areaEntity = z.enum(["task", "goal", "project", "note", "resource"]);
  const archiveEntity = z.enum([
    "goal",
    "project",
    "task",
    "note",
    "resource",
    "topic",
    "contact",
  ]);

  // ---- NOTEBOOKS (multi-value junction) -----------------------------------

  server.registerTool(
    "add_note_to_notebook",
    {
      title: "Add Note to Notebook",
      description:
        "Add a note to a notebook (a note can belong to many notebooks). Notebooks are how notes are grouped — putting two notes in the same notebook is also how you 'relate' them.",
      inputSchema: {
        note_id: z.string(),
        notebook: z.string().min(1).describe("Notebook name."),
      },
    },
    async ({ note_id, notebook }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.notes.addNotebook(note_id, notebook)),
      ),
  );

  server.registerTool(
    "remove_note_from_notebook",
    {
      title: "Remove Note from Notebook",
      description: "Remove a note from one of its notebooks.",
      inputSchema: {
        note_id: z.string(),
        notebook: z.string().min(1).describe("Notebook name."),
      },
    },
    async ({ note_id, notebook }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.notes.removeNotebook(note_id, notebook)),
      ),
  );

  server.registerTool(
    "set_note_notebooks",
    {
      title: "Set Note Notebooks",
      description:
        "Replace the full set of notebooks a note belongs to. Pass the complete desired list; existing membership not in the list is removed.",
      inputSchema: {
        note_id: z.string(),
        notebooks: z.array(z.string()).describe("Complete notebook name list."),
      },
    },
    async ({ note_id, notebooks }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.notes.replaceNotebooks(note_id, notebooks)),
      ),
  );

  server.registerTool(
    "get_related_notes",
    {
      title: "Get Related Notes",
      description:
        "Get notes related to a given note. Related-notes are derived from shared notebook membership (there is no explicit relation to set) — this is a read-only query.",
      inputSchema: { note_id: z.string() },
    },
    async ({ note_id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.notes.related(note_id))),
  );

  // ---- AREA JUNCTIONS (post-hoc link/unlink) ------------------------------

  server.registerTool(
    "link_area",
    {
      title: "Link Entity to Area",
      description:
        "Link an existing task, goal, project, note, or resource to an area. Entities can belong to multiple areas. Use this to add an area link after creation.",
      inputSchema: {
        entity: areaEntity.describe("The kind of entity being linked."),
        id: z.string().describe("The entity's id."),
        area_id: z.string(),
      },
    },
    async ({ entity, id, area_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await areaLinkers[entity].linkArea(id, area_id)),
      ),
  );

  server.registerTool(
    "unlink_area",
    {
      title: "Unlink Entity from Area",
      description:
        "Remove the link between an existing task, goal, project, note, or resource and an area.",
      inputSchema: {
        entity: areaEntity.describe("The kind of entity being unlinked."),
        id: z.string().describe("The entity's id."),
        area_id: z.string(),
      },
    },
    async ({ entity, id, area_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await areaLinkers[entity].unlinkArea(id, area_id)),
      ),
  );

  // ---- TASK ↔ PROJECT JUNCTION --------------------------------------------

  server.registerTool(
    "link_task_to_project",
    {
      title: "Link Task to Project",
      description:
        "Link an existing task to a project. A task can belong to multiple projects.",
      inputSchema: { task_id: z.string(), project_id: z.string() },
    },
    async ({ task_id, project_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.tasks.linkProject(task_id, project_id)),
      ),
  );

  server.registerTool(
    "unlink_task_from_project",
    {
      title: "Unlink Task from Project",
      description: "Remove the link between a task and a project.",
      inputSchema: { task_id: z.string(), project_id: z.string() },
    },
    async ({ task_id, project_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.tasks.unlinkProject(task_id, project_id)),
      ),
  );

  // ---- ARCHIVE / RESTORE (per entity) -------------------------------------

  server.registerTool(
    "archive_entity",
    {
      title: "Archive Entity",
      description:
        "Archive a goal, project, task, note, resource, topic, or contact (move it to long-term storage). For areas use archive_area instead.",
      inputSchema: {
        entity: archiveEntity.describe("The kind of entity to archive."),
        id: z.string(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ entity, id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await archivers[entity].archive(id))),
  );

  server.registerTool(
    "restore_entity",
    {
      title: "Restore Entity",
      description:
        "Restore a previously archived goal, project, task, note, resource, topic, or contact. For areas use restore_area instead.",
      inputSchema: {
        entity: archiveEntity.describe("The kind of entity to restore."),
        id: z.string(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ entity, id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await archivers[entity].restore(id))),
  );

  // ---- CONTACT ↔ TASK -----------------------------------------------------

  server.registerTool(
    "link_contact_to_task",
    {
      title: "Link Contact to Task",
      description:
        "Link a contact to a task, optionally with a role (e.g. 'Owner', 'Reviewer').",
      inputSchema: {
        contact_id: z.string(),
        task_id: z.string(),
        role_in_task: z.string().optional(),
      },
    },
    async ({ contact_id, task_id, role_in_task }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(
          await client.contacts.linkTask(contact_id, task_id, role_in_task),
        ),
      ),
  );

  // ---- REMAINING UPDATE VERBS ---------------------------------------------

  server.registerTool(
    "update_resource",
    {
      title: "Update Resource",
      description:
        "Update fields on an existing resource (name, url, type, status, topic, favorite).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        topic_id: z.string().nullable().optional(),
        favorite: z.boolean().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.resources.update(id, body))),
  );

  server.registerTool(
    "update_topic",
    {
      title: "Update Topic",
      description:
        "Update fields on an existing topic (name, favorite, linked areas).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        favorite: z.boolean().optional(),
        area_ids: z.array(z.string()).optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.topics.update(id, body))),
  );

  server.registerTool(
    "update_contact",
    {
      title: "Update Contact",
      description:
        "Update fields on an existing contact (name, role, organization, group, channels, follow-up interval, notes).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        role: z.string().optional(),
        organization: z.string().optional(),
        group: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        follow_up_interval_days: z.number().int().min(0).max(365).optional(),
        favorite: z.boolean().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.contacts.update(id, body))),
  );
}
