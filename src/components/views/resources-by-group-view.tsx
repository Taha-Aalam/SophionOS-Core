"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Globe, Plus } from "lucide-react";

import { ResourceRow } from "@/components/entities/resource-row";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/views/empty-state";
import type { Resource } from "@/lib/types/domain.types";

export interface ResourceGroup {
  groupId: string;
  groupName: string;
  resources: Resource[];
}

interface ResourcesByGroupViewProps {
  groups: ResourceGroup[];
  getAreas: (resource: Resource) => Array<{ name: string; icon?: string | null }>;
  getGoalNames: (resource: Resource) => string[];
  getProjectNames: (resource: Resource) => string[];
  getTaskNames: (resource: Resource) => string[];
  getTopicName: (resource: Resource) => string | undefined;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (resource: Resource) => void;
  onSaveStatusChange?: (id: string, saved: boolean) => void;
  onNewResource?: (groupId: string) => void;
  emptyMessage?: string;
}

function CollapsibleResourceGroup({
  group,
  getAreas,
  getGoalNames,
  getProjectNames,
  getTaskNames,
  getTopicName,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onDelete,
  onEdit,
  onSaveStatusChange,
  onNewResource,
  defaultOpen = true,
}: {
  group: ResourceGroup;
  getAreas: (resource: Resource) => Array<{ name: string; icon?: string | null }>;
  getGoalNames: (resource: Resource) => string[];
  getProjectNames: (resource: Resource) => string[];
  getTaskNames: (resource: Resource) => string[];
  getTopicName: (resource: Resource) => string | undefined;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (resource: Resource) => void;
  onSaveStatusChange?: (id: string, saved: boolean) => void;
  onNewResource?: (groupId: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2 px-1 py-2"
      >
        <span className="text-muted-foreground">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </span>
        <Badge variant="outline" className="text-xs font-medium">
          {group.groupName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {group.resources.length} {group.resources.length === 1 ? "resource" : "resources"}
        </span>
      </div>

      {isOpen && (
        <div className="rounded-lg border divide-y">
          {group.resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              areas={getAreas(resource)}
              goalNames={getGoalNames(resource)}
              projectNames={getProjectNames(resource)}
              taskNames={getTaskNames(resource)}
              topicName={getTopicName(resource)}
              onToggleFavorite={onToggleFavorite}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
              onEdit={onEdit}
              onSaveStatusChange={onSaveStatusChange}
            />
          ))}
          {onNewResource && group.groupId !== "unassigned" && (
            <button
              onClick={(e) => { e.stopPropagation(); onNewResource(group.groupId); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="size-4" />
              New resource
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ResourcesByGroupView({
  groups,
  getAreas,
  getGoalNames,
  getProjectNames,
  getTaskNames,
  getTopicName,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onDelete,
  onEdit,
  onSaveStatusChange,
  onNewResource,
  emptyMessage = "No resources in this view.",
}: ResourcesByGroupViewProps) {
  if (groups.length === 0 || groups.every((g) => g.resources.length === 0)) {
    return (
      <EmptyState
        icon={Globe}
        title="No resources here"
        description={emptyMessage}
      />
    );
  }

  const sorted = [
    ...groups.filter((g) => g.groupId !== "unassigned"),
    ...groups.filter((g) => g.groupId === "unassigned"),
  ];

  return (
    <div className="px-6 py-4">
      {sorted.map((group) => (
        <CollapsibleResourceGroup
          key={group.groupId}
          group={group}
          getAreas={getAreas}
          getGoalNames={getGoalNames}
          getProjectNames={getProjectNames}
          getTaskNames={getTaskNames}
          getTopicName={getTopicName}
          onToggleFavorite={onToggleFavorite}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
          onEdit={onEdit}
          onSaveStatusChange={onSaveStatusChange}
          onNewResource={onNewResource}
          defaultOpen={group.groupId !== "unassigned"}
        />
      ))}
    </div>
  );
}
