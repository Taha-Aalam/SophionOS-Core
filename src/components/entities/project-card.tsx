"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Project } from "@/lib/types/domain.types";
import {
  getProjectDueState,
  getProjectStatusLabel,
  type ProjectTaskStats,
} from "@/lib/utils/projects";

interface ProjectCardProps {
  project: Project;
  areaName?: string;
  taskStats?: ProjectTaskStats;
  onEdit?: (project: Project) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-muted text-muted-foreground",
};

export function ProjectCard({
  project,
  areaName,
  taskStats,
  onEdit,
}: ProjectCardProps) {
  const router = useRouter();
  const dueState = getProjectDueState(project.due_date);
  const resolvedAreaName = areaName?.trim() || "Unassigned";
  const totalTasks = taskStats?.total;
  const completedTasks = taskStats?.completed ?? 0;
  const progress =
    totalTasks && totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : project.progress || 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:ring-2 hover:ring-primary/20 cursor-pointer",
        project.is_archived && "opacity-60 grayscale",
      )}
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-tight line-clamp-2">{project.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">{resolvedAreaName}</p>
          </div>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label="Edit project"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[project.priority])}>
            {project.priority}
          </Badge>
          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[project.status])}>
            {getProjectStatusLabel(project.status)}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <CheckSquare className="size-3" />
              {typeof totalTasks === "number"
                ? `${completedTasks}/${totalTasks}`
                : "Unavailable"}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 whitespace-nowrap",
                dueState.tone === "warning" && "text-red-600 dark:text-red-400",
                dueState.tone === "muted" && "text-muted-foreground/80",
              )}
            >
              <Calendar className="size-3" />
              {dueState.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
