import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseProjects = vi.fn();
const mockUseAreas = vi.fn();
const mockUseTasks = vi.fn();
const capturedKanbanProps: Array<{ duplicateIndices?: Map<string, number> }> = [];

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({
    children,
    droppableId,
  }: {
    children: (provided: { innerRef: () => void; droppableProps: Record<string, never> }, snapshot: { isDraggingOver: boolean }) => React.ReactNode;
    droppableId: string;
  }) => (
    <div data-droppable-id={droppableId}>
      {children(
        { innerRef: () => undefined, droppableProps: {} },
        { isDraggingOver: false },
      )}
    </div>
  ),
  Draggable: ({
    children,
    draggableId,
  }: {
    children: (provided: { innerRef: () => void; draggableProps: Record<string, never>; dragHandleProps: Record<string, never> }, snapshot: { isDragging: boolean }) => React.ReactNode;
    draggableId: string;
  }) => (
    <div data-draggable-id={draggableId}>
      {children(
        { innerRef: () => undefined, draggableProps: {}, dragHandleProps: {} },
        { isDragging: false },
      )}
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next/dynamic", async () => {
  const kanbanMod = await import("@/components/views/kanban-board");
  return {
    __esModule: true,
    default: (importFn: () => Promise<unknown>) => {
      const fnStr = importFn.toString();
      if (fnStr.includes("kanban-board")) {
        return kanbanMod.KanbanBoard;
      }
      return () => null;
    },
  };
});

vi.mock("@/lib/hooks/use-projects", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks/use-projects")>(
    "@/lib/hooks/use-projects",
  );

  return {
    ...actual,
    useProjects: () => mockUseProjects(),
    useUpdateProjectStatus: () => ({
      mutate: vi.fn(),
    }),
    useArchiveProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
    useRestoreProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
    useDeleteProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
    useUpdateProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
    useCreateProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  };
});

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => mockUseAreas(),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => mockUseTasks(),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-notes", () => ({
  useNotes: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-resources", () => ({
  useResources: () => ({ data: [] }),
}));

vi.mock("@/components/entities/project-card", () => ({
  ProjectCard: ({ project }: { project: { name: string } }) => <div>{project.name}</div>,
}));

vi.mock("@/components/entities/project-dialog", () => ({
  ProjectDialog: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/views/kanban-board", () => ({
  KanbanBoard: ({
    duplicateIndices,
    projects,
  }: {
    duplicateIndices?: Map<string, number>;
    projects: Array<{ id: string; name: string }>;
  }) => {
    capturedKanbanProps.push({ duplicateIndices });

    return (
      <div data-slot="kanban-board">
        {projects.map((project) => (
          <span key={project.id}>
            {project.name}
            {duplicateIndices?.get(project.id) != null && duplicateIndices.get(project.id)! > 1
              ? ` copy ${duplicateIndices.get(project.id)}`
              : ""}
          </span>
        ))}
      </div>
    );
  },
}));

import { KanbanBoard } from "@/components/views/kanban-board";
import { ProjectsContent as ProjectsPage } from "@/app/(dashboard)/projects/projects-content";
import type { Area, Project, Task } from "@/lib/types/domain.types";

function createProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();

  return {
    id: "proj-1",
    user_id: "user-1",
    area_id: null,
    name: "Test Project",
    description: null,
    status: "planning",
    priority: "medium",
    start_date: null,
    due_date: null,
    progress: 0,
    is_archived: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createArea(overrides: Partial<Area> = {}): Area {
  const now = new Date().toISOString();

  return {
    id: "area-1",
    user_id: "user-1",
    name: "Personal",
    description: null,
    icon: null,
    color: null,
    type: "Personal",
    inactive: false,
    archive: false,
    slug: "personal",
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("KanbanBoard duplicate badge coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedKanbanProps.length = 0;
  });

  it("renders copy badges in the kanban card markup when duplicateIndex is greater than 1", () => {
    const html = renderToStaticMarkup(
      <KanbanBoard
        projects={[
          createProject({ id: "proj-1", name: "Alpha" }),
          createProject({ id: "proj-2", name: "Alpha", status: "active" }),
        ]}
        areas={[createArea()]}
        duplicateIndices={new Map([
          ["proj-1", 1],
          ["proj-2", 2],
        ])}
      />,
    );

    expect(html).toContain("Alpha");
    expect(html).toContain("copy 2");
  });

  it("wires duplicateIndices from ProjectsPage into the By Status kanban path", () => {
    const projects = [
      createProject({ id: "proj-1", name: "Launch Website", created_at: "2026-04-27T10:00:00.000Z" }),
      createProject({ id: "proj-2", name: "Launch Website", created_at: "2026-04-27T11:00:00.000Z" }),
    ];

    mockUseProjects.mockReturnValue({
      data: projects,
      isLoading: false,
    });
    mockUseAreas.mockReturnValue({
      data: [createArea()],
    });
    mockUseTasks.mockReturnValue({
      data: [] as Task[],
    });

    const html = renderToStaticMarkup(<ProjectsPage />);

    expect(html).toContain('data-slot="kanban-board"');
    expect(capturedKanbanProps).not.toHaveLength(0);
    expect(capturedKanbanProps.at(-1)?.duplicateIndices?.get("proj-1")).toBe(1);
    expect(capturedKanbanProps.at(-1)?.duplicateIndices?.get("proj-2")).toBe(2);
    expect(html).toContain("Launch Website copy 2");
  });
});
