"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/views/empty-state";
import { useUpdateProjectStatus } from "@/lib/hooks/use-projects";
import { type Area, type Project } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/utils/constants";
import {
  getProjectDueState,
  getProjectStatusLabel,
  groupProjectsByStatus,
} from "@/lib/utils/projects";

interface KanbanColumn {
  id: ProjectStatus;
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: PROJECT_STATUS.PLANNING, color: "border-purple-500" },
  { id: PROJECT_STATUS.ACTIVE, color: "border-green-500" },
  { id: PROJECT_STATUS.COMPLETED, color: "border-border" },
  { id: PROJECT_STATUS.ON_HOLD, color: "border-yellow-500" },
];

interface KanbanBoardProps {
  projects: Project[];
  areas: Area[];
  duplicateIndices?: Map<string, number>;
  onProjectClick?: (project: Project) => void;
}

export function KanbanBoard({ projects, areas, duplicateIndices, onProjectClick }: KanbanBoardProps) {
  const updateStatus = useUpdateProjectStatus();
  const [optimisticProjects, setOptimisticProjects] = React.useState<Project[]>(projects);

  // Reset optimistic state when the upstream `projects` prop changes,
  // unless a mutation is in flight (so a slow server doesn't snap the
  // dragged card back to its old column). `setLastProjects` is the
  // "Adjusting state on prop change" pattern — calling setState during
  // render, not from inside an effect.
  const [lastProjects, setLastProjects] = React.useState(projects);
  if (projects !== lastProjects) {
    setLastProjects(projects);
    if (!updateStatus.isPending) {
      setOptimisticProjects(projects);
    }
  }

  const areaMap = React.useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const projectsByStatus = React.useMemo(() => groupProjectsByStatus(optimisticProjects), [optimisticProjects]);

  if (optimisticProjects.length === 0) {
    return <EmptyState icon={FolderOpen} title="No projects" description="Create a project to get started." />;
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as ProjectStatus;

    // Optimistic update: move the project to the new status immediately
    setOptimisticProjects((prev) =>
      prev.map((p) => (p.id === draggableId ? { ...p, status: newStatus } : p)),
    );

    updateStatus.mutate(
      { id: draggableId, status: newStatus },
      {
        onError: () => {
          // Revert on error
          setOptimisticProjects(projects);
        },
      },
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-72">
            <div className={cn("border-t-2 rounded-t-lg", column.color)}>
              <div className="flex items-center justify-between rounded-b-lg bg-muted/50 px-3 py-2">
                <h3 className="font-medium text-sm">{getProjectStatusLabel(column.id)}</h3>
                <Badge variant="secondary" className="text-xs">
                  {projectsByStatus[column.id].length}
                </Badge>
              </div>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "min-h-[200px] space-y-2 rounded-b-lg p-2 transition-colors",
                    snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/20",
                  )}
                >
                  {projectsByStatus[column.id].map((project, index) => {
                    const area = project.area_id ? areaMap.get(project.area_id) : null;
                    const dueState = getProjectDueState(project.due_date);

                    return (
                      <Draggable key={project.id} draggableId={project.id} index={index}>
                        {(draggableProvided, draggableSnapshot) => {
                          // The board sits inside `overflow-x-auto` and is a
                          // descendant of transform-animated containers.
                          // @hello-pangea/dnd positions the dragged node with an
                          // inline `transform` derived from the node's
                          // `getBoundingClientRect()`; any ancestor transform or
                          // scroll offset shifts that rect, so the card renders
                          // offset from the cursor. Portaling the dragging node
                          // to `document.body` removes every ancestor from the
                          // positioning math so the card tracks the pointer 1:1.
                          const card = (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              onClick={() => onProjectClick?.(project)}
                              className={cn(
                                "cursor-pointer rounded-xl bg-card p-3 ring-1 ring-foreground/10 ease-[var(--ease-out-quint)]",
                                // Only transition while idle. @hello-pangea/dnd
                                // writes an inline `transform` every frame to
                                // track the pointer; animating that transform
                                // (transition-all) makes the card lag behind the
                                // cursor, so disable transitions during drag.
                                draggableSnapshot.isDragging
                                  ? "shadow-soft-lg ring-2 ring-primary"
                                  : "transition-all duration-300 shadow-soft hover:-translate-y-0.5 hover:shadow-soft-lg hover:ring-primary/30",
                              )}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                                    {project.name}
                                    {duplicateIndices?.get(project.id) != null && duplicateIndices.get(project.id)! > 1 && (
                                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        copy {duplicateIndices.get(project.id)}
                                      </span>
                                    )}
                                  </h4>
                                </div>

                                <p className="truncate text-xs text-muted-foreground">
                                  {area?.name ?? "Unassigned"}
                                </p>

                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      project.priority === "high" &&
                                        "border-orange-300 text-orange-600",
                                      project.priority === "medium" &&
                                        "border-blue-300 text-blue-600",
                                      project.priority === "low" &&
                                        "border-border text-muted-foreground",
                                    )}
                                  >
                                    {project.priority}
                                  </Badge>
                                  <span
                                    className={cn(
                                      "text-xs",
                                      dueState.tone === "warning"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {dueState.label}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{project.progress || 0}%</span>
                                  </div>
                                  <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={project.progress || 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.name} progress`}>
                                    <div
                                      className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out-quint)]"
                                      style={{ width: `${project.progress || 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );

                          return draggableSnapshot.isDragging
                            ? createPortal(card, document.body)
                            : card;
                        }}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
