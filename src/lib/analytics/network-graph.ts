import type {
  Area,
  Contact,
  Goal,
  Note,
  Project,
  Resource,
  Task,
  Topic,
} from "@/lib/types/domain.types";

export type NetworkNodeType =
  | "area"
  | "goal"
  | "project"
  | "task"
  | "note"
  | "resource"
  | "contact"
  | "topic"
  | "notebook";

export interface NetworkGraphFilters {
  /** Default true (all-inclusive). False hides archived nodes + their edges. */
  includeArchived?: boolean;
  /** Default true. False hides notebook hub nodes + their edges. */
  includeNotebooks?: boolean;
  /** Default true. False hides topic nodes + their edges. */
  includeTopics?: boolean;
}

export interface NetworkGraphInput {
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  topics: Topic[];
  contacts: Contact[];
  filters?: NetworkGraphFilters;
}

export interface NetworkGraphNode {
  id: string;
  type: NetworkNodeType;
  label: string;
  archived: boolean;
  href: string;
}

export interface NetworkGraphEdge {
  source: string;
  target: string;
  kind: string;
}

function labelOf(entity: { name?: string | null; title?: string | null }, fallback: string): string {
  return entity.name ?? entity.title ?? fallback;
}

function areaIdsOf(entity: { area_id?: string | null; linkedAreaIds?: string[] }): string[] {
  if (entity.linkedAreaIds?.length) return entity.linkedAreaIds;
  return entity.area_id ? [entity.area_id] : [];
}

function goalIdsOf(entity: { goal_id?: string | null; linkedGoalIds?: string[] }): string[] {
  if (entity.linkedGoalIds?.length) return entity.linkedGoalIds;
  const single = (entity as { goal_id?: string | null }).goal_id;
  return single ? [single] : [];
}

function projectIdsOf(entity: {
  project_id?: string | null;
  linkedProjectIds?: string[];
}): string[] {
  if (entity.linkedProjectIds?.length) return entity.linkedProjectIds;
  return entity.project_id ? [entity.project_id] : [];
}

function taskIdsOf(entity: { linkedTaskIds?: string[] }): string[] {
  return entity.linkedTaskIds ?? [];
}

function isAreaArchived(area: Area): boolean {
  return Boolean(area.archive);
}

function isGoalArchived(goal: Goal): boolean {
  return Boolean(goal.is_archived);
}

function isProjectArchived(project: Project): boolean {
  return Boolean(project.is_archived);
}

function isTaskArchived(task: Task): boolean {
  return Boolean(task.is_archived);
}

function isNoteArchived(note: Note): boolean {
  return Boolean(note.is_archived || note.status === "archive");
}

function isResourceArchived(resource: Resource): boolean {
  return Boolean(resource.is_archived);
}

function isTopicArchived(topic: Topic): boolean {
  return Boolean(topic.is_archived);
}

function isContactArchived(contact: Contact): boolean {
  return Boolean(contact.archive);
}

function notebooksOf(note: Note): string[] {
  const names = new Set<string>();
  if (typeof note.notebook === "string" && note.notebook.trim()) names.add(note.notebook.trim());
  for (const name of note.notebooks ?? []) {
    if (typeof name === "string" && name.trim()) names.add(name.trim());
  }
  return [...names];
}

export function buildNetworkGraph(input: NetworkGraphInput): {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
} {
  const includeArchived = input.filters?.includeArchived ?? true;
  const includeNotebooks = input.filters?.includeNotebooks ?? true;
  const includeTopics = input.filters?.includeTopics ?? true;

  const nodes: NetworkGraphNode[] = [];
  const edges: NetworkGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();

  function addNode(node: NetworkGraphNode): void {
    if (nodeIds.has(node.id)) return;
    if (!includeArchived && node.archived) return;
    nodeIds.add(node.id);
    nodes.push(node);
  }

  function addEdge(source: string, target: string, kind: string): void {
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    const key = `${source}→${target}:${kind}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, kind });
  }

  for (const area of input.areas) {
    addNode({
      id: `area:${area.id}`,
      type: "area",
      label: labelOf(area, "Untitled area"),
      archived: isAreaArchived(area),
      href: `/areas/${area.id}`,
    });
  }

  for (const goal of input.goals) {
    addNode({
      id: `goal:${goal.id}`,
      type: "goal",
      label: labelOf(goal, "Untitled goal"),
      archived: isGoalArchived(goal),
      href: `/goals/${goal.id}`,
    });
  }

  for (const project of input.projects) {
    addNode({
      id: `project:${project.id}`,
      type: "project",
      label: labelOf(project, "Untitled project"),
      archived: isProjectArchived(project),
      href: `/projects/${project.id}`,
    });
  }

  for (const task of input.tasks) {
    addNode({
      id: `task:${task.id}`,
      type: "task",
      label: labelOf(task, "Untitled task"),
      archived: isTaskArchived(task),
      href: "/tasks",
    });
  }

  for (const note of input.notes) {
    addNode({
      id: `note:${note.id}`,
      type: "note",
      label: labelOf(note, "Untitled note"),
      archived: isNoteArchived(note),
      href: `/notes/${note.id}`,
    });
  }

  for (const resource of input.resources) {
    addNode({
      id: `resource:${resource.id}`,
      type: "resource",
      label: labelOf(resource, "Untitled resource"),
      archived: isResourceArchived(resource),
      href: "/resources",
    });
  }

  for (const topic of input.topics) {
    if (!includeTopics) continue;
    addNode({
      id: `topic:${topic.id}`,
      type: "topic",
      label: labelOf(topic, "Untitled topic"),
      archived: isTopicArchived(topic),
      href: `/topics/${topic.id}`,
    });
  }

  for (const contact of input.contacts) {
    addNode({
      id: `contact:${contact.id}`,
      type: "contact",
      label: labelOf(contact, "Untitled contact"),
      archived: isContactArchived(contact),
      href: `/contacts/${contact.id}`,
    });
  }

  const notebookNames = new Set<string>();
  if (includeNotebooks) {
    for (const note of input.notes) {
      for (const name of notebooksOf(note)) notebookNames.add(name);
    }
    for (const name of notebookNames) {
      addNode({
        id: `notebook:${name}`,
        type: "notebook",
        label: name,
        archived: false,
        href: `/notes?notebook=${encodeURIComponent(name)}`,
      });
    }
  }

  // Areas > Goals > Projects > Tasks (+ direct area links at each level).
  for (const goal of input.goals) {
    for (const areaId of areaIdsOf(goal)) addEdge(`area:${areaId}`, `goal:${goal.id}`, "area-goal");
  }
  for (const project of input.projects) {
    for (const goalId of goalIdsOf(project))
      addEdge(`goal:${goalId}`, `project:${project.id}`, "goal-project");
    for (const areaId of areaIdsOf(project))
      addEdge(`area:${areaId}`, `project:${project.id}`, "area-project");
  }
  for (const task of input.tasks) {
    for (const projectId of projectIdsOf(task))
      addEdge(`project:${projectId}`, `task:${task.id}`, "project-task");
    for (const goalId of goalIdsOf(task))
      addEdge(`goal:${goalId}`, `task:${task.id}`, "goal-task");
    for (const areaId of areaIdsOf(task))
      addEdge(`area:${areaId}`, `task:${task.id}`, "area-task");
  }

  // Tasks > Notes / Resources / Contacts.
  for (const note of input.notes) {
    for (const taskId of taskIdsOf(note))
      addEdge(`task:${taskId}`, `note:${note.id}`, "task-note");
    for (const areaId of areaIdsOf(note))
      addEdge(`area:${areaId}`, `note:${note.id}`, "area-note");
    for (const goalId of goalIdsOf(note))
      addEdge(`goal:${goalId}`, `note:${note.id}`, "goal-note");
    for (const projectId of projectIdsOf(note))
      addEdge(`project:${projectId}`, `note:${note.id}`, "project-note");
  }
  for (const resource of input.resources) {
    for (const taskId of taskIdsOf(resource))
      addEdge(`task:${taskId}`, `resource:${resource.id}`, "task-resource");
    for (const areaId of areaIdsOf(resource))
      addEdge(`area:${areaId}`, `resource:${resource.id}`, "area-resource");
    for (const goalId of goalIdsOf(resource))
      addEdge(`goal:${goalId}`, `resource:${resource.id}`, "goal-resource");
    for (const projectId of projectIdsOf(resource))
      addEdge(`project:${projectId}`, `resource:${resource.id}`, "project-resource");
  }
  for (const contact of input.contacts) {
    for (const taskId of taskIdsOf(contact))
      addEdge(`task:${taskId}`, `contact:${contact.id}`, "task-contact");
    for (const areaId of areaIdsOf(contact))
      addEdge(`area:${areaId}`, `contact:${contact.id}`, "area-contact");
    for (const goalId of goalIdsOf(contact))
      addEdge(`goal:${goalId}`, `contact:${contact.id}`, "goal-contact");
    for (const projectId of projectIdsOf(contact))
      addEdge(`project:${projectId}`, `contact:${contact.id}`, "project-contact");
  }

  // Area > Topics > Notes / Resources.
  if (includeTopics) {
    for (const topic of input.topics) {
      if (topic.area_id) addEdge(`area:${topic.area_id}`, `topic:${topic.id}`, "area-topic");
    }
    for (const note of input.notes) {
      if (note.topic_id) addEdge(`topic:${note.topic_id}`, `note:${note.id}`, "topic-note");
    }
    for (const resource of input.resources) {
      if (resource.topic_id)
        addEdge(`topic:${resource.topic_id}`, `resource:${resource.id}`, "topic-resource");
    }
  }

  // Notebook > Note hubs (shared notebook membership surfaces Note1↔Note2 via the hub).
  if (includeNotebooks) {
    for (const note of input.notes) {
      for (const name of notebooksOf(note)) {
        addEdge(`notebook:${name}`, `note:${note.id}`, "notebook-note");
      }
    }
  }

  return { nodes, edges };
}
