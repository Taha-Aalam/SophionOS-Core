/**
 * Parity tools — close the remaining REST→MCP gaps so every REST capability is
 * reachable by an AI agent: single-entity getters, deletes, the goal/project
 * cross-link verbs, contact unlinks, and area updates.
 *
 * Entity-typed where the underlying client methods are uniform, to keep the
 * tool count (and the model's selection burden) low.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { LifeOSClient } from "../client.js";
import { jsonResult, runTool, type ToolTextResult } from "../utils.js";

type Gettable = { get: (id: string) => Promise<unknown> };
type Deletable = { delete: (id: string) => Promise<unknown> };
type GoalLinkable = {
  linkGoal: (id: string, goal_id: string) => Promise<unknown>;
  unlinkGoal: (id: string, goal_id: string) => Promise<unknown>;
};
type ProjectLinkable = {
  linkProject: (id: string, project_id: string) => Promise<unknown>;
  unlinkProject: (id: string, project_id: string) => Promise<unknown>;
};

export function registerParityTools(
  server: McpServer,
  client: LifeOSClient,
): void {
  // Getters for the entities that lack a dedicated get tool. (goal, project,
  // and note already have get_goal_detail / get_project / get_note.)
  const getters: Record<string, Gettable> = {
    area: client.areas,
    task: client.tasks,
    resource: client.resources,
    topic: client.topics,
    contact: client.contacts,
  };

  // Delete is destructive and exists for every entity.
  const deleters: Record<string, Deletable> = {
    area: client.areas,
    goal: client.goals,
    project: client.projects,
    task: client.tasks,
    note: client.notes,
    resource: client.resources,
    topic: client.topics,
    contact: client.contacts,
  };

  // Entities that link to a goal.
  const goalLinkers: Record<string, GoalLinkable> = {
    project: client.projects,
    task: client.tasks,
    contact: client.contacts,
  };

  // Entities that link to a project (post-hoc; create tools also accept
  // project_ids at creation time).
  const projectLinkers: Record<string, ProjectLinkable> = {
    task: client.tasks,
    note: client.notes,
    resource: client.resources,
  };

  const getEntity = z.enum(["area", "task", "resource", "topic", "contact"]);
  const deleteEntity = z.enum([
    "area",
    "goal",
    "project",
    "task",
    "note",
    "resource",
    "topic",
    "contact",
  ]);
  const goalLinkEntity = z.enum(["project", "task", "contact"]);
  const projectLinkEntity = z.enum(["task", "note", "resource"]);

  // ---- GETTERS ------------------------------------------------------------

  server.registerTool(
    "get_entity",
    {
      title: "Get Entity",
      description:
        "Fetch a single area, task, resource, topic, or contact by id (with its hydrated relations). For goals use get_goal_detail, for projects use get_project, for notes use get_note.",
      inputSchema: {
        entity: getEntity.describe("The kind of entity to fetch."),
        id: z.string(),
      },
    },
    async ({ entity, id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await getters[entity].get(id))),
  );

  // ---- DELETE -------------------------------------------------------------

  server.registerTool(
    "delete_entity",
    {
      title: "Delete Entity",
      description:
        "Permanently delete an entity by id. This is irreversible and cleans up junction links — prefer archive_entity/archive_area to merely hide something. Supports area, goal, project, task, note, resource, topic, contact.",
      inputSchema: {
        entity: deleteEntity.describe("The kind of entity to delete."),
        id: z.string(),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ entity, id }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await deleters[entity].delete(id))),
  );

  // ---- GOAL CROSS-LINKS ---------------------------------------------------

  server.registerTool(
    "link_goal",
    {
      title: "Link Entity to Goal",
      description:
        "Link an existing project, task, or contact to a goal. Use this to attach a goal after creation.",
      inputSchema: {
        entity: goalLinkEntity.describe("project, task, or contact."),
        id: z.string().describe("The entity's id."),
        goal_id: z.string(),
      },
    },
    async ({ entity, id, goal_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await goalLinkers[entity].linkGoal(id, goal_id)),
      ),
  );

  server.registerTool(
    "unlink_goal",
    {
      title: "Unlink Entity from Goal",
      description:
        "Remove the link between an existing project, task, or contact and a goal.",
      inputSchema: {
        entity: goalLinkEntity.describe("project, task, or contact."),
        id: z.string().describe("The entity's id."),
        goal_id: z.string(),
      },
    },
    async ({ entity, id, goal_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await goalLinkers[entity].unlinkGoal(id, goal_id)),
      ),
  );

  // ---- PROJECT CROSS-LINKS ------------------------------------------------

  server.registerTool(
    "link_project",
    {
      title: "Link Entity to Project",
      description:
        "Link an existing task, note, or resource to a project. Use this to attach a project after creation.",
      inputSchema: {
        entity: projectLinkEntity.describe("task, note, or resource."),
        id: z.string().describe("The entity's id."),
        project_id: z.string(),
      },
    },
    async ({ entity, id, project_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await projectLinkers[entity].linkProject(id, project_id)),
      ),
  );

  server.registerTool(
    "unlink_project",
    {
      title: "Unlink Entity from Project",
      description:
        "Remove the link between an existing task, note, or resource and a project.",
      inputSchema: {
        entity: projectLinkEntity.describe("task, note, or resource."),
        id: z.string().describe("The entity's id."),
        project_id: z.string(),
      },
    },
    async ({ entity, id, project_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await projectLinkers[entity].unlinkProject(id, project_id)),
      ),
  );

  // ---- CONTACT UNLINKS ----------------------------------------------------

  server.registerTool(
    "unlink_contact_from_project",
    {
      title: "Unlink Contact from Project",
      description: "Remove the link between a contact and a project.",
      inputSchema: { contact_id: z.string(), project_id: z.string() },
    },
    async ({ contact_id, project_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.contacts.unlinkProject(contact_id, project_id)),
      ),
  );

  server.registerTool(
    "unlink_contact_from_task",
    {
      title: "Unlink Contact from Task",
      description: "Remove the link between a contact and a task.",
      inputSchema: { contact_id: z.string(), task_id: z.string() },
    },
    async ({ contact_id, task_id }): Promise<ToolTextResult> =>
      runTool(async () =>
        jsonResult(await client.contacts.unlinkTask(contact_id, task_id)),
      ),
  );

  // ---- AREA UPDATE --------------------------------------------------------

  server.registerTool(
    "update_area",
    {
      title: "Update Area",
      description:
        "Update fields on an existing area (name, type, description, icon, color).",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      },
    },
    async ({ id, ...body }): Promise<ToolTextResult> =>
      runTool(async () => jsonResult(await client.areas.update(id, body))),
  );
}
