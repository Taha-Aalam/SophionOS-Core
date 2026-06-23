"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/entities/project-card";
import type { Project } from "@/lib/types/domain.types";

export interface ProjectsByAreaGroup {
  areaId: string;
  areaName: string;
  projects: Project[];
}

interface ProjectsByAreaViewProps {
  groups: ProjectsByAreaGroup[];
  areaNames: Map<string, string>;
  duplicateIndices: Map<string, number>;
  isLoading?: boolean;
  onEdit: (project: Project) => void;
  onCreateProject: (areaId: string) => void;
  returnTo?: string | null;
  returnToChain?: string | null;
}

function CollapsibleAreaSection({
  group,
  areaNames,
  duplicateIndices,
  onEdit,
  onCreateProject,
  returnTo,
  returnToChain,
}: {
  group: ProjectsByAreaGroup;
  areaNames: Map<string, string>;
  duplicateIndices: Map<string, number>;
  onEdit: (project: Project) => void;
  onCreateProject: (areaId: string) => void;
  returnTo?: string | null;
  returnToChain?: string | null;
}) {
  // The unassigned ("Unassigned") group is collapsed by default; real areas
  // open by default.
  const [isOpen, setIsOpen] = useState(group.areaId !== "unassigned");

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2 mb-3 group"
      >
        <span className="text-muted-foreground">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </span>
        <Badge variant="outline" className="text-xs font-medium">
          {group.areaId === "unassigned" ? "Unassigned" : group.areaName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({group.projects.length} {group.projects.length === 1 ? "project" : "projects"})
        </span>
        {group.areaId !== "unassigned" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreateProject(group.areaId);
            }}
            title={`Create project in ${group.areaName}`}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {group.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
              areaNames={
                (project.linkedAreaIds ?? [])
                  .concat(project.area_id ? [project.area_id] : [])
                  .map((id) => areaNames.get(id))
                  .filter((n): n is string => Boolean(n))
              }
              duplicateIndex={duplicateIndices.get(project.id)}
              onEdit={onEdit}
              returnTo={returnTo}
              returnToChain={returnToChain}
            />
          ))}
          {group.areaId !== "unassigned" && (
            <button
              onClick={() => onCreateProject(group.areaId)}
              className="flex flex-col items-center justify-center gap-2 h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="size-8" />
              <span className="text-sm font-medium">New Project in {group.areaName}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectsByAreaView({
  groups,
  areaNames,
  duplicateIndices,
  isLoading,
  onEdit,
  onCreateProject,
  returnTo,
  returnToChain,
}: ProjectsByAreaViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No projects grouped by area yet.</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <CollapsibleAreaSection
          key={group.areaId}
          group={group}
          areaNames={areaNames}
          duplicateIndices={duplicateIndices}
          onEdit={onEdit}
          onCreateProject={onCreateProject}
          returnTo={returnTo}
          returnToChain={returnToChain}
        />
      ))}
    </div>
  );
}
