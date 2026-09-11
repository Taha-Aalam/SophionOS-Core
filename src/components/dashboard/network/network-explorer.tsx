"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  FileText,
  Layers,
  Link2,
  ListChecks,
  Tag,
  Target,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildNetworkGraph,
  type NetworkGraphNode,
  type NetworkNodeType,
} from "@/lib/analytics/network-graph";
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

interface NetworkExplorerProps {
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  topics: Topic[];
  contacts: Contact[];
}

type FlowNodeData = {
  label: string;
  type: NetworkNodeType;
  archived: boolean;
};

type FlowNode = Node<FlowNodeData, "graph">;

const TYPE_META: Record<NetworkNodeType, { label: string; border: string; bg: string }> = {
  area: { label: "Areas", border: "oklch(0.58 0.14 260)", bg: "oklch(0.97 0.01 260)" },
  goal: { label: "Goals", border: "oklch(0.56 0.12 315)", bg: "oklch(0.97 0.015 320)" },
  project: { label: "Projects", border: "oklch(0.7 0.12 85)", bg: "oklch(0.98 0.015 90)" },
  task: { label: "Tasks", border: "oklch(0.62 0.13 155)", bg: "oklch(0.97 0.015 155)" },
  note: { label: "Notes", border: "oklch(0.55 0.02 260)", bg: "oklch(0.98 0.005 260)" },
  resource: { label: "Resources", border: "oklch(0.65 0.1 200)", bg: "oklch(0.97 0.015 210)" },
  contact: { label: "Contacts", border: "oklch(0.6 0.15 20)", bg: "oklch(0.97 0.015 25)" },
  topic: { label: "Topics", border: "oklch(0.62 0.1 175)", bg: "oklch(0.97 0.015 175)" },
  notebook: { label: "Notebooks", border: "oklch(0.68 0.14 60)", bg: "oklch(0.98 0.02 70)" },
};

const TYPE_ORDER: NetworkNodeType[] = [
  "area",
  "goal",
  "project",
  "task",
  "topic",
  "note",
  "resource",
  "contact",
  "notebook",
];

function TypeIcon({ type }: { type: NetworkNodeType }) {
  switch (type) {
    case "area":
      return <Layers aria-hidden="true" />;
    case "goal":
      return <Target aria-hidden="true" />;
    case "project":
      return <Briefcase aria-hidden="true" />;
    case "task":
      return <ListChecks aria-hidden="true" />;
    case "note":
      return <FileText aria-hidden="true" />;
    case "resource":
      return <Link2 aria-hidden="true" />;
    case "contact":
      return <Users aria-hidden="true" />;
    case "topic":
      return <Tag aria-hidden="true" />;
    case "notebook":
      return <BookOpen aria-hidden="true" />;
  }
}

function GraphNode({ data, selected }: NodeProps<FlowNode>) {
  const meta = TYPE_META[data.type];
  return (
    <div
      className="flex w-48 items-center gap-2 rounded-lg border-2 bg-card px-2.5 py-2 text-left shadow-soft transition-[box-shadow,opacity] duration-200 ease-[var(--ease-out-quint)]"
      style={{ borderColor: meta.border }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-card-foreground [&_svg]:size-3.5"
        style={{ backgroundColor: meta.bg, color: meta.border }}
      >
        <TypeIcon type={data.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">
          {data.label}
          {selected ? <span className="sr-only"> (selected)</span> : null}
        </span>
        <span className="block text-2xs capitalize text-muted-foreground">
          {data.type}
          {data.archived ? " · archived" : ""}
        </span>
      </span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}

const nodeTypes = { graph: GraphNode };

const COLUMN_X: Record<NetworkNodeType, number> = {
  area: 0,
  goal: 260,
  project: 520,
  task: 780,
  topic: 260,
  note: 1040,
  resource: 1040,
  contact: 1040,
  notebook: 1300,
};

export function NetworkExplorer(props: NetworkExplorerProps) {
  const router = useRouter();
  const [includeArchived, setIncludeArchived] = useState(true);
  const [includeNotebooks, setIncludeNotebooks] = useState(true);
  const [includeTopics, setIncludeTopics] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graph = useMemo(
    () =>
      buildNetworkGraph({
        areas: props.areas,
        goals: props.goals,
        projects: props.projects,
        tasks: props.tasks,
        notes: props.notes,
        resources: props.resources,
        topics: props.topics,
        contacts: props.contacts,
        filters: { includeArchived, includeNotebooks, includeTopics },
      }),
    [
      props.areas,
      props.goals,
      props.projects,
      props.tasks,
      props.notes,
      props.resources,
      props.topics,
      props.contacts,
      includeArchived,
      includeNotebooks,
      includeTopics,
    ],
  );

  const query = search.trim().toLowerCase();
  const nodesById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const flowNodes: FlowNode[] = useMemo(() => {
    const perColumn = new Map<NetworkNodeType, number>();
    return graph.nodes.map((node) => {
      const row = perColumn.get(node.type) ?? 0;
      perColumn.set(node.type, row + 1);
      const dimmed = query.length > 0 && !node.label.toLowerCase().includes(query);
      return {
        id: node.id,
        type: "graph",
        position: { x: COLUMN_X[node.type], y: row * 76 },
        data: { label: node.label, type: node.type, archived: node.archived },
        style: { opacity: dimmed ? 0.3 : 1 },
      };
    });
  }, [graph.nodes, query]);

  const flowEdges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        id: `${edge.source}→${edge.target}:${edge.kind}`,
        source: edge.source,
        target: edge.target,
        label: edge.kind,
        style: { stroke: "#90A4AE", strokeOpacity: 0.6, strokeWidth: 1.5 },
      })),
    [graph.edges],
  );

  const counts = useMemo(() => {
    const map = new Map<NetworkNodeType, number>();
    for (const node of graph.nodes) map.set(node.type, (map.get(node.type) ?? 0) + 1);
    return map;
  }, [graph.nodes]);

  const selected: NetworkGraphNode | null = selectedId ? (nodesById.get(selectedId) ?? null) : null;
  const selectedNeighbors = useMemo(() => {
    if (!selectedId) return [];
    const ids = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return [...ids]
      .map((id) => nodesById.get(id))
      .filter((n): n is NetworkGraphNode => Boolean(n));
  }, [selectedId, graph.edges, nodesById]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft data-icon="inline-start" />
          Dashboard
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Context network</h1>
          <p className="text-xs text-muted-foreground">
            {graph.nodes.length} things · {graph.edges.length} connections. Drag to explore, click
            a node for details.
          </p>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="network-show-archived"
              checked={includeArchived}
              onCheckedChange={(value) => setIncludeArchived(value === true)}
            />
            <Label htmlFor="network-show-archived" className="cursor-pointer text-sm">
              Archived
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="network-show-notebooks"
              checked={includeNotebooks}
              onCheckedChange={(value) => setIncludeNotebooks(value === true)}
            />
            <Label htmlFor="network-show-notebooks" className="cursor-pointer text-sm">
              Notebooks
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="network-show-topics"
              checked={includeTopics}
              onCheckedChange={(value) => setIncludeTopics(value === true)}
            />
            <Label htmlFor="network-show-topics" className="cursor-pointer text-sm">
              Topics
            </Label>
          </div>
          <Input
            type="search"
            aria-label="Search things in the network"
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="ml-auto w-full sm:max-w-56"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Legend">
          {TYPE_ORDER.map((type) => {
            const count = counts.get(type) ?? 0;
            if (count === 0) return null;
            return (
              <Badge key={type} variant="secondary" className="gap-1 tabular-nums">
                <TypeIcon type={type} />
                {TYPE_META[type].label}: {count}
              </Badge>
            );
          })}
        </div>
      </Card>

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          {graph.nodes.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nothing to show. Try enabling Archived, Notebooks, or Topics above.
            </Card>
          ) : (
            <div className="h-[65vh] min-h-105 overflow-hidden rounded-xl border border-border/70 bg-card">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                fitView
                minZoom={0.1}
                maxZoom={2}
                colorMode="system"
                proOptions={{ hideAttribution: false }}
                aria-label="Context network map"
              >
                <Background gap={24} />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable aria-hidden="true" />
              </ReactFlow>
            </div>
          )}
        </TabsContent>
        <TabsContent value="list">
          <Card className="p-4">
            <ul className="flex flex-col gap-4">
              {TYPE_ORDER.map((type) => {
                const items = graph.nodes.filter((n) => n.type === type);
                if (items.length === 0) return null;
                return (
                  <li key={type}>
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <TypeIcon type={type} />
                      {TYPE_META[type].label} ({items.length})
                    </h2>
                    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => (
                        <li key={item.id}>
                          <a
                            href={item.href}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground underline-offset-4 hover:bg-muted hover:underline"
                          >
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.archived ? (
                              <Badge variant="secondary">Archived</Badge>
                            ) : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selected ? <TypeIcon type={selected.type} /> : null}
              {selected?.label}
            </SheetTitle>
            <SheetDescription className="capitalize">
              {selected?.type}
              {selected?.archived ? " · archived" : ""} · {selectedNeighbors.length}{" "}
              connection{selectedNeighbors.length === 1 ? "" : "s"}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => router.push(selected.href)}
              >
                Open {selected.type}
              </Button>
              <div>
                <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Connected to
                </h3>
                {selectedNeighbors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No connections.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {selectedNeighbors.map((neighbor) => (
                      <li key={neighbor.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(neighbor.id)}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                        >
                          <TypeIcon type={neighbor.type} />
                          <span className="min-w-0 flex-1 truncate">{neighbor.label}</span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {neighbor.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
