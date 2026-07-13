"use client";

import {
  BookOpen,
  CheckSquare,
  CircleDashed,
  FolderKanban,
  Layers,
  Search,
  Target,
} from "lucide-react";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  LinearFilters,
  type LinearFilter,
  type LinearFilterTypeConfig,
} from "@/components/ui/linear-filters";
import {
  buildFilters,
  filterSingle,
  filterValues,
} from "@/components/ui/linear-filter-state";
import { NOTES_SEARCH_PLACEHOLDER } from "@/lib/utils/note-page-display";

type NamedOption = { id: string; name: string; icon?: string | null };

export type NotesFilterBarProps = {
  search: string;
  status: string;
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  taskIds: string[];
  notebook: string;
  areas: NamedOption[];
  goals: NamedOption[];
  projects: NamedOption[];
  tasks: NamedOption[];
  notebooks: string[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAreaIdsChange: (ids: string[]) => void;
  onGoalIdsChange: (ids: string[]) => void;
  onProjectIdsChange: (ids: string[]) => void;
  onTaskIdsChange: (ids: string[]) => void;
  onNotebookChange: (value: string) => void;
};

export function NotesFilterBar({
  search,
  status,
  areaIds,
  goalIds,
  projectIds,
  taskIds,
  notebook,
  areas,
  goals,
  projects,
  tasks,
  notebooks,
  onSearchChange,
  onStatusChange,
  onAreaIdsChange,
  onGoalIdsChange,
  onProjectIdsChange,
  onTaskIdsChange,
  onNotebookChange,
}: NotesFilterBarProps) {
  const types = useMemo<LinearFilterTypeConfig[]>(
    () => [
      {
        type: "status",
        label: "Status",
        icon: <CircleDashed className="size-3.5" />,
        selection: "single",
        options: [
          { value: "inbox", label: "Inbox" },
          { value: "to_review", label: "To Review" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
          { value: "archive", label: "Archive" },
        ],
      },
      {
        type: "area",
        label: "Area",
        icon: <Layers className="size-3.5" />,
        selection: "multi",
        options: areas.map((a) => ({
          value: a.id,
          label: a.icon ? `${a.icon} ${a.name}` : a.name,
        })),
      },
      {
        type: "goal",
        label: "Goal",
        icon: <Target className="size-3.5" />,
        selection: "multi",
        options: goals.map((g) => ({ value: g.id, label: g.name })),
      },
      {
        type: "project",
        label: "Project",
        icon: <FolderKanban className="size-3.5" />,
        selection: "multi",
        options: projects.map((p) => ({ value: p.id, label: p.name })),
      },
      {
        type: "task",
        label: "Task",
        icon: <CheckSquare className="size-3.5" />,
        selection: "multi",
        options: tasks.map((t) => ({ value: t.id, label: t.name })),
      },
      {
        type: "notebook",
        label: "Notebook",
        icon: <BookOpen className="size-3.5" />,
        selection: "single",
        options: notebooks.map((nb) => ({ value: nb, label: nb })),
      },
    ],
    [areas, goals, projects, tasks, notebooks],
  );

  const filters = useMemo(
    () =>
      buildFilters([
        { type: "status", value: status ? [status] : [], selection: "single" },
        { type: "area", value: areaIds },
        { type: "goal", value: goalIds },
        { type: "project", value: projectIds },
        { type: "task", value: taskIds },
        { type: "notebook", value: notebook ? [notebook] : [], selection: "single" },
      ]),
    [status, areaIds, goalIds, projectIds, taskIds, notebook],
  );

  const handleChange = (next: LinearFilter[]) => {
    onStatusChange(filterSingle(next, "status"));
    onAreaIdsChange(filterValues(next, "area"));
    onGoalIdsChange(filterValues(next, "goal"));
    onProjectIdsChange(filterValues(next, "project"));
    onTaskIdsChange(filterValues(next, "task"));
    onNotebookChange(filterSingle(next, "notebook"));
  };

  return (
    <LinearFilters
      types={types}
      filters={filters}
      onFiltersChange={handleChange}
      leading={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={NOTES_SEARCH_PLACEHOLDER}
            className="h-10 sm:h-8 w-44 pl-8 text-xs"
          />
        </div>
      }
    />
  );
}
