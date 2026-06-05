"use client";

import React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { Badge } from "@/components/ui/badge";
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
  { id: PROJECT_STATUS.COMPLETED, color: "border-gray-400" },
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

  // Keep optimistic state in sync with the latest server-provided list whenever
  // a stale snapshot is rendered; the actual reorder happens via setOptimistic
  // inside handleDragEnd, and the subsequent refetch will resolve the source
  // of truth through React Query invalidation.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticProjects(projects);
  }, [projects]);

  const areaMap = React.useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const projectsByStatus = React.useMemo(() => groupProjectsByStatus(optimisticProjects), [optimisticProjects]);

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
                        {(draggableProvided, draggableSnapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                            onClick={() => onProjectClick?.(project)}
                            className={cn(
                              "cursor-pointer rounded-lg border bg-card p-3 transition-all",
                              draggableSnapshot.isDragging
                                ? "shadow-lg ring-2 ring-primary"
                                : "hover:border-primary/30 hover:shadow-md",
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
                                    project.priority === "urgent" &&
                                      "border-red-300 text-red-600",
                                    project.priority === "high" &&
                                      "border-orange-300 text-orange-600",
                                    project.priority === "medium" &&
                                      "border-blue-300 text-blue-600",
                                    project.priority === "low" &&
                                      "border-gray-300 text-gray-600",
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
                                <div className="h-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${project.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
