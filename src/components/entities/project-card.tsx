"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Archive, Calendar, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Project } from "@/lib/types/domain.types";
import {
  getProjectDueState,
  getProjectStatusLabel,
} from "@/lib/utils/projects";
import ProgressRing from "@/components/charts/progress-ring";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants/entity-colors";

import { DeleteEntityPopover } from "./delete-entity-popover";
import { useClickableProps } from "@/components/ui/clickable";

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
  duplicateIndex?: number;
  onEdit?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onRestore?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  isDeleting?: boolean;
  /** When provided, appended as ?returnTo= to the project detail navigation. */
  returnTo?: string | null;
  /** When provided, appended as ?chain= to preserve the return-to chain. */
  returnToChain?: string | null;
  /**
   * Correlation rollups for Goals, Tasks, Notes, and Resources. When omitted,
   * falls back to the server-hydrated `project.{goalCount,taskCount,noteCount,
   * resourceCount}` fields populated by `projectService` so the same project
   * renders the same numbers on every surface.
   */
  rollups?: ProjectCardRollups;
}

const STATUS_EMOJIS: Record<string, string> = {
  planning: "📝",
  active: "🚀",
  on_hold: "⏸️",
  completed: "✅",
};

const BADGE_CLS = "h-5 text-2xs leading-none px-1.5 py-0 items-center";

export function ProjectCard({
  project,
  areaName,
  areaNames,
  areaIcons,
  duplicateIndex,
  onArchive,
  onRestore,
  onDelete,
  isDeleting,
  returnTo,
  returnToChain,
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
  const progress = project.progress ?? 0;

  const resolvedRollups: ProjectCardRollups = rollups ?? {
    goalCount: project.goalCount ?? 0,
    taskCount: project.taskCount ?? 0,
    noteCount: project.noteCount ?? 0,
    resourceCount: project.resourceCount ?? 0,
  };

  const projectHref = (() => {
    const base = buildProjectDetailHref(project);
    if (returnTo) {
      const chain = returnToChain ? `&chain=${returnToChain}` : "";
      return `${base}?returnTo=${encodeURIComponent(returnTo)}${chain}`;
    }
    return base;
  })();

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden hover-lift",
        project.is_archived && "opacity-60 grayscale",
      )}
      onClick={() => {
        router.push(projectHref);
      }}
      {...useClickableProps(() => router.push(projectHref))}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">📁</span>
              <h3 className="font-medium truncate text-sm">{project.name}</h3>
              {duplicateIndex != null && duplicateIndex > 1 && (
                <Badge
                  variant="outline"
                  className="text-2xs px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                >
                  copy {duplicateIndex}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {resolvedAreaNames.slice(0, 2).map((name, index) => (
                <Badge key={`${name}-${index}`} variant="outline" className={BADGE_CLS}>
                  {areaIcons?.[index] ? `${areaIcons[index]} ` : ""}
                  {name}
                </Badge>
              ))}
              {resolvedAreaNames.length > 2 && (
                <Badge variant="outline" className={BADGE_CLS}>
                  +{resolvedAreaNames.length - 2}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(BADGE_CLS, "capitalize", STATUS_COLORS[project.status])}
              >
                {STATUS_EMOJIS[project.status] ? `${STATUS_EMOJIS[project.status]} ` : ""}
                {getProjectStatusLabel(project.status)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(BADGE_CLS, "capitalize", PRIORITY_COLORS[project.priority])}
              >
                {project.priority}
              </Badge>
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">
              {project.description || " "}
            </p>
          </div>

          <ProgressRing
            percentage={progress}
            size={48}
            strokeWidth={4}
            className="shrink-0"
          />
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 whitespace-nowrap" title="Goals">
            <span className="text-xs">🎯</span>
            <span>{resolvedRollups.goalCount}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Tasks">
            <span className="text-xs">☑️</span>
            <span>{resolvedRollups.taskCount}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Notes">
            <span className="text-xs">📝</span>
            <span>{resolvedRollups.noteCount}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Resources">
            <span className="text-xs">🔗</span>
            <span>{resolvedRollups.resourceCount}</span>
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between text-2xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span className={cn(dueState.isOverdue && "text-destructive font-medium")}>
              {dueState.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {project.status === "completed" && (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">
                Completed
              </Badge>
            )}
            {project.is_archived ? (
              <>
                <Badge variant="outline">
                  <Archive className="size-3 mr-1" />
                  Archived
                </Badge>
                {onRestore && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Restore project"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(project);
                    }}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                )}
                {onDelete && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <DeleteEntityPopover
                      variant="row"
                      entityLabel="project"
                      entityName={project.name}
                      disabled={isDeleting}
                      onConfirm={() => onDelete(project)}
                    />
                  </span>
                )}
              </>
            ) : (
              <>
                {onArchive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Archive project"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(project);
                    }}
                  >
                    <Archive className="size-3" />
                  </Button>
                )}
                {onDelete && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <DeleteEntityPopover
                      variant="row"
                      entityLabel="project"
                      entityName={project.name}
                      disabled={isDeleting}
                      onConfirm={() => onDelete(project)}
                    />
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
