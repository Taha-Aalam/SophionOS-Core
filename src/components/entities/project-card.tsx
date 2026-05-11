"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Edit, FolderKanban, Map } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Project } from "@/lib/types/domain.types";
import {
  getProjectDueState,
  getProjectStatusLabel,
  type ProjectTaskStats,
} from "@/lib/utils/projects";
import ProgressRing from "@/components/charts/progress-ring";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";

export interface ProjectCardRollups {
  goalCount: number;
  taskCount: number;
  noteCount: number;
  resourceCount: number;
}

interface ProjectCardProps {
  project: Project;
  areaName?: string;
  /**
   * When provided, renders chips for each linked area name (up to 2, with a
   * `+N` overflow chip). Falls back to `areaName` for backwards compatibility.
   */
  areaNames?: string[];
  areaIcons?: (string | null)[];
  taskStats?: ProjectTaskStats;
  duplicateIndex?: number;
  onEdit?: (project: Project) => void;
  /** When provided, appended as ?returnTo= to the project detail navigation. */
  returnTo?: string | null;
  /** Correlation rollups for Goals, Notes, and Resources */
  rollups?: ProjectCardRollups;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function ProjectCard({
  project,
  areaName,
  areaNames,
  areaIcons,
  taskStats,
  duplicateIndex,
  onEdit,
  returnTo,
  rollups,
}: ProjectCardProps) {
  const router = useRouter();
  const dueState = getProjectDueState(project.due_date);
  const resolvedAreaNames = (() => {
    if (areaNames && areaNames.length > 0) {
      return areaNames.map((n) => n.trim()).filter(Boolean);
    }
    const fallback = areaName?.trim();
    return fallback ? [fallback] : ["Unassigned"];
  })();
  const visibleAreaNames = resolvedAreaNames.slice(0, 2);
  const overflowAreaCount = Math.max(resolvedAreaNames.length - visibleAreaNames.length, 0);
  const totalTasks = taskStats?.total;
  const completedTasks = taskStats?.completed ?? 0;
  const progress =
    totalTasks && totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : project.progress || 0;

  const showAllCounts = true; // Always show all four correlation counts, even when zero

  const projectHref = (() => {
    const base = buildProjectDetailHref(project);
    if (returnTo) {
      return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
    }
    return base;
  })();

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all cursor-pointer hover:ring-2 hover:ring-primary/20",
        project.is_archived && "opacity-60 grayscale",
      )}
      onClick={() => {
        router.push(projectHref);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="size-4 text-muted-foreground" />
              <h3 className="font-medium truncate text-sm">{project.name}</h3>
              {duplicateIndex != null && duplicateIndex > 1 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  copy {duplicateIndex}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {visibleAreaNames.map((name, index) => (
                <Badge
                  key={`${name}-${index}`}
                  variant="secondary"
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0"
                >
                  {areaIcons?.[index] ? (
                    <span className="text-[10px] leading-none">{areaIcons[index]}</span>
                  ) : (
                    <Map className="size-2.5 shrink-0" />
                  )}
                  {name}
                </Badge>
              ))}
              {overflowAreaCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{overflowAreaCount}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[project.priority])}
              >
                {project.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {getProjectStatusLabel(project.status)}
              </Badge>
            </div>

            {project.description && (
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                aria-label={`Edit ${project.name}`}
              >
                <Edit className="size-4" />
              </Button>
            )}
            <ProgressRing
              percentage={progress}
              size={48}
              strokeWidth={4}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showAllCounts && rollups ? (
                <>
                  <span className="flex items-center gap-1 whitespace-nowrap" title="Goals">
                    <span className="text-xs">🎯</span>
                    <span>{rollups.goalCount}</span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap" title="Tasks">
                    <span className="text-xs">☑️</span>
                    <span>{rollups.taskCount}</span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap" title="Notes">
                    <span className="text-xs">📝</span>
                    <span>{rollups.noteCount}</span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap" title="Resources">
                    <span className="text-xs">🔗</span>
                    <span>{rollups.resourceCount}</span>
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap",
                  dueState.isOverdue && "text-destructive font-medium",
                )}
              >
                <Calendar className="size-3" />
                {dueState.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {project.status === "completed" && (
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">
                  Completed
                </Badge>
              )}
              {project.is_archived && (
                <Badge variant="outline">
                  Archived
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
