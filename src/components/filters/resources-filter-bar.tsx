"use client";

import {
  CheckSquare,
  CircleDashed,
  FileType,
  FolderKanban,
  Layers,
  Tag,
  Target,
} from "lucide-react";
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
import { RESOURCE_STATUS, RESOURCE_TYPE } from "@/lib/utils/constants";

type NamedOption = { id: string; name: string; icon?: string | null };

export type ResourcesFilterBarProps = {
  status: string;
  type: string;
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  taskIds: string[];
  topicIds: string[];
  areas: NamedOption[];
  goals: NamedOption[];
  projects: NamedOption[];
  tasks: NamedOption[];
  topics: NamedOption[];
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAreaIdsChange: (ids: string[]) => void;
  onGoalIdsChange: (ids: string[]) => void;
  onProjectIdsChange: (ids: string[]) => void;
  onTaskIdsChange: (ids: string[]) => void;
  onTopicIdsChange: (ids: string[]) => void;
};

export function ResourcesFilterBar({
  status,
  type,
  areaIds,
  goalIds,
  projectIds,
  taskIds,
  topicIds,
  areas,
  goals,
  projects,
  tasks,
  topics,
  onStatusChange,
  onTypeChange,
  onAreaIdsChange,
  onGoalIdsChange,
  onProjectIdsChange,
  onTaskIdsChange,
  onTopicIdsChange,
}: ResourcesFilterBarProps) {
  const types = useMemo<LinearFilterTypeConfig[]>(
    () => [
      {
        type: "status",
        label: "Status",
        icon: <CircleDashed className="size-3.5" />,
        selection: "single",
        options: [
          { value: RESOURCE_STATUS.INBOX, label: "Inbox" },
          { value: RESOURCE_STATUS.TO_REVIEW, label: "To Review" },
          { value: RESOURCE_STATUS.ACTIVE, label: "Active" },
          { value: RESOURCE_STATUS.COMPLETED, label: "Completed" },
        ],
      },
      {
        type: "type",
        label: "Type",
        icon: <FileType className="size-3.5" />,
        selection: "single",
        options: [
          { value: RESOURCE_TYPE.WEBSITE, label: "Website" },
          { value: RESOURCE_TYPE.ARTICLE, label: "Article" },
          { value: RESOURCE_TYPE.VIDEO, label: "Video" },
          { value: RESOURCE_TYPE.DOCUMENT, label: "Document" },
          { value: RESOURCE_TYPE.PODCAST, label: "Podcast" },
          { value: RESOURCE_TYPE.SOCIAL_MEDIA, label: "Social Media" },
          { value: RESOURCE_TYPE.TOOL, label: "Tool" },
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
        type: "topic",
        label: "Topic",
        icon: <Tag className="size-3.5" />,
        selection: "multi",
        options: topics.map((t) => ({ value: t.id, label: t.name })),
      },
    ],
    [areas, goals, projects, tasks, topics],
  );

  const filters = useMemo(
    () =>
      buildFilters([
        { type: "status", value: status ? [status] : [], selection: "single" },
        { type: "type", value: type ? [type] : [], selection: "single" },
        { type: "area", value: areaIds },
        { type: "goal", value: goalIds },
        { type: "project", value: projectIds },
        { type: "task", value: taskIds },
        { type: "topic", value: topicIds },
      ]),
    [status, type, areaIds, goalIds, projectIds, taskIds, topicIds],
  );

  const handleChange = (next: LinearFilter[]) => {
    onStatusChange(filterSingle(next, "status"));
    onTypeChange(filterSingle(next, "type"));
    onAreaIdsChange(filterValues(next, "area"));
    onGoalIdsChange(filterValues(next, "goal"));
    onProjectIdsChange(filterValues(next, "project"));
    onTaskIdsChange(filterValues(next, "task"));
    onTopicIdsChange(filterValues(next, "topic"));
  };

  return <LinearFilters types={types} filters={filters} onFiltersChange={handleChange} />;
}
