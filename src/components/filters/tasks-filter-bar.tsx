"use client";

import { FolderKanban, Layers, SignalHigh, Target } from "lucide-react";
import { useMemo } from "react";

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

type NamedOption = { id: string; name: string; icon?: string | null };

export type TasksFilterBarProps = {
  priority: string;
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  areas: NamedOption[];
  goals: NamedOption[];
  projects: NamedOption[];
  onPriorityChange: (value: string) => void;
  onAreaIdsChange: (ids: string[]) => void;
  onGoalIdsChange: (ids: string[]) => void;
  onProjectIdsChange: (ids: string[]) => void;
};

export function TasksFilterBar({
  priority,
  areaIds,
  goalIds,
  projectIds,
  areas,
  goals,
  projects,
  onPriorityChange,
  onAreaIdsChange,
  onGoalIdsChange,
  onProjectIdsChange,
}: TasksFilterBarProps) {
  const types = useMemo<LinearFilterTypeConfig[]>(
    () => [
      {
        type: "priority",
        label: "Priority",
        icon: <SignalHigh className="size-3.5" />,
        selection: "single",
        options: [
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
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
    ],
    [areas, goals, projects],
  );

  const filters = useMemo(
    () =>
      buildFilters([
        { type: "priority", value: priority ? [priority] : [], selection: "single" },
        { type: "area", value: areaIds },
        { type: "goal", value: goalIds },
        { type: "project", value: projectIds },
      ]),
    [priority, areaIds, goalIds, projectIds],
  );

  const handleChange = (next: LinearFilter[]) => {
    onPriorityChange(filterSingle(next, "priority"));
    onAreaIdsChange(filterValues(next, "area"));
    onGoalIdsChange(filterValues(next, "goal"));
    onProjectIdsChange(filterValues(next, "project"));
  };

  return <LinearFilters types={types} filters={filters} onFiltersChange={handleChange} />;
}
