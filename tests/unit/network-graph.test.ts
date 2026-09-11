import { describe, expect, it } from "vitest";

import { buildNetworkGraph } from "@/lib/analytics/network-graph";
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

function area(input: Partial<Area> & { id: string }): Area {
  return {
    id: input.id,
    user_id: "user_1",
    name: input.name ?? "Area",
    description: null,
    icon: null,
    color: null,
    type: "personal",
    metadata: {},
    archive: input.archive ?? false,
    inactive: input.inactive ?? false,
    is_archived: input.is_archived ?? null,
    slug: input.id,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
  } as Area;
}

const empty = {
  areas: [],
  goals: [],
  projects: [],
  tasks: [],
  notes: [],
  resources: [],
  topics: [],
  contacts: [],
};

describe("buildNetworkGraph tracer", () => {
  it("links Areas > Goals > Projects > Tasks", () => {
    const graph = buildNetworkGraph({
      ...empty,
      areas: [area({ id: "a1", name: "Health" })],
      goals: [
        {
          id: "g1",
          user_id: "user_1",
          name: "Run marathon",
          linkedAreaIds: ["a1"],
        } as Goal,
      ],
      projects: [
        {
          id: "p1",
          user_id: "user_1",
          name: "Training plan",
          linkedGoalIds: ["g1"],
        } as Project,
      ],
      tasks: [
        {
          id: "t1",
          user_id: "user_1",
          name: "Morning run",
          linkedProjectIds: ["p1"],
        } as Task,
      ],
      notes: [] as Note[],
      resources: [] as Resource[],
      topics: [] as Topic[],
      contacts: [] as Contact[],
    });

    expect(graph.nodes.map((n) => n.id).sort()).toEqual([
      "area:a1",
      "goal:g1",
      "project:p1",
      "task:t1",
    ]);
    expect(graph.edges).toEqual([
      { source: "area:a1", target: "goal:g1", kind: "area-goal" },
      { source: "goal:g1", target: "project:p1", kind: "goal-project" },
      { source: "project:p1", target: "task:t1", kind: "project-task" },
    ]);
  });

  it("links Tasks > Notes, Resources, and Contacts", () => {
    const graph = buildNetworkGraph({
      ...empty,
      tasks: [{ id: "t1", user_id: "user_1", name: "Task" } as Task],
      notes: [
        { id: "n1", user_id: "user_1", name: "Note", linkedTaskIds: ["t1"] } as Note,
      ],
      resources: [
        { id: "r1", user_id: "user_1", name: "Resource", linkedTaskIds: ["t1"] } as Resource,
      ],
      contacts: [
        { id: "c1", user_id: "user_1", name: "Contact", linkedTaskIds: ["t1"] } as Contact,
      ],
    });

    expect(graph.edges).toContainEqual({ source: "task:t1", target: "note:n1", kind: "task-note" });
    expect(graph.edges).toContainEqual({
      source: "task:t1",
      target: "resource:r1",
      kind: "task-resource",
    });
    expect(graph.edges).toContainEqual({
      source: "task:t1",
      target: "contact:c1",
      kind: "task-contact",
    });
  });

  it("links Area > Topics > Notes and Resources", () => {
    const graph = buildNetworkGraph({
      ...empty,
      areas: [area({ id: "a1" })],
      topics: [{ id: "top1", user_id: "user_1", name: "Topic", area_id: "a1" } as Topic],
      notes: [{ id: "n1", user_id: "user_1", name: "Note", topic_id: "top1" } as Note],
      resources: [
        { id: "r1", user_id: "user_1", name: "Resource", topic_id: "top1" } as Resource,
      ],
    });

    expect(graph.edges).toContainEqual({
      source: "area:a1",
      target: "topic:top1",
      kind: "area-topic",
    });
    expect(graph.edges).toContainEqual({
      source: "topic:top1",
      target: "note:n1",
      kind: "topic-note",
    });
    expect(graph.edges).toContainEqual({
      source: "topic:top1",
      target: "resource:r1",
      kind: "topic-resource",
    });
  });

  it("surfaces shared notebooks via notebook hub nodes", () => {
    const graph = buildNetworkGraph({
      ...empty,
      notes: [
        { id: "n1", user_id: "user_1", name: "Note 1", notebooks: ["Ideas"] } as Note,
        { id: "n2", user_id: "user_1", name: "Note 2", notebooks: ["Ideas"] } as Note,
      ],
    });

    expect(graph.nodes.map((n) => n.id)).toContain("notebook:Ideas");
    expect(graph.edges).toContainEqual({
      source: "notebook:Ideas",
      target: "note:n1",
      kind: "notebook-note",
    });
    expect(graph.edges).toContainEqual({
      source: "notebook:Ideas",
      target: "note:n2",
      kind: "notebook-note",
    });
  });

  it("excludes archived nodes and their edges when includeArchived is false", () => {
    const graph = buildNetworkGraph({
      ...empty,
      areas: [area({ id: "a1" })],
      goals: [
        {
          id: "g1",
          user_id: "user_1",
          name: "Archived goal",
          is_archived: true,
          linkedAreaIds: ["a1"],
        } as Goal,
      ],
      filters: { includeArchived: false },
    });

    expect(graph.nodes.map((n) => n.id)).toEqual(["area:a1"]);
    expect(graph.edges).toEqual([]);
  });

  it("hides notebook and topic nodes when opted out", () => {
    const base = {
      ...empty,
      areas: [area({ id: "a1" })],
      topics: [{ id: "top1", user_id: "user_1", name: "Topic", area_id: "a1" } as Topic],
      notes: [
        {
          id: "n1",
          user_id: "user_1",
          name: "Note",
          topic_id: "top1",
          notebooks: ["Ideas"],
        } as Note,
      ],
    };

    const noNotebooks = buildNetworkGraph({ ...base, filters: { includeNotebooks: false } });
    expect(noNotebooks.nodes.map((n) => n.id)).not.toContain("notebook:Ideas");
    expect(
      noNotebooks.edges.some((e) => e.source.startsWith("notebook:")),
    ).toBe(false);

    const noTopics = buildNetworkGraph({ ...base, filters: { includeTopics: false } });
    expect(noTopics.nodes.map((n) => n.id)).not.toContain("topic:top1");
    expect(noTopics.edges.some((e) => e.kind.startsWith("topic-"))).toBe(false);
    expect(noTopics.edges.some((e) => e.kind === "area-topic")).toBe(false);
  });

  it("returns an empty graph for empty input", () => {
    expect(buildNetworkGraph({ ...empty })).toEqual({ nodes: [], edges: [] });
  });
});
