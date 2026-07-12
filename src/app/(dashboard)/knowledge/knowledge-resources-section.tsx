"use client";

import { useState } from "react";
import {
  Archive,
  Bookmark,
  Clock,
  FolderOpen,
  Globe,
  Heart,
  Inbox as InboxIcon,
  Map as MapIcon,
  Tag,
  Target,
  Zap,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { ResourceRow } from "@/components/entities/resource-row";
import { ResourceRowSkeleton } from "@/components/views/list-page-skeleton";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
import {
  RESOURCE_STATUS,
} from "@/lib/utils/constants";
import {
  RESOURCE_VIEW,
  getResourceLinkedAreaIds,
  getResourceLinkedGoalIds,
  getResourceLinkedProjectIds,
  getResourceLinkedTaskIds,
  type ResourceView,
} from "@/lib/utils/resources";
import type { CreateResourceInput, Resource } from "@/lib/types/domain.types";
import { SectionHeader } from "./knowledge-section-header";

export interface KnowledgeResourcesSectionProps {
  resources: Resource[];
  archivedResources: Resource[];
  resourcesLoading: boolean;
  areaNames: Map<string, string>;
  areaIcons: Map<string, string | null>;
  goalNames: Map<string, string>;
  projNames: Map<string, string>;
  topicNames: Map<string, string>;
  allTasks: { id: string; name: string }[];
  createResourceIsPending: boolean;
  updateResourceIsPending: boolean;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateResource: (input: CreateResourceInput) => Promise<void>;
  onUpdateResource: (id: string, input: Record<string, unknown>) => Promise<void>;
}

export function KnowledgeResourcesSection({
  resources,
  archivedResources,
  resourcesLoading,
  areaNames,
  areaIcons,
  goalNames,
  projNames,
  topicNames,
  allTasks,
  createResourceIsPending,
  updateResourceIsPending,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onDelete,
  onCreateResource,
  onUpdateResource,
}: KnowledgeResourcesSectionProps) {
  const [resourcesTab, setResourcesTab] = useState<ResourceView>(RESOURCE_VIEW.ALL);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceCreateOpen, setResourceCreateOpen] = useState(false);
  const [resourcePrefill, setResourcePrefill] = useState<{
    areaIds?: string[];
    goalIds?: string[];
    projectId?: string;
    topicId?: string;
  }>({});

  const filteredResources = (() => {
    switch (resourcesTab) {
      case RESOURCE_VIEW.INBOX: return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case RESOURCE_VIEW.TO_REVIEW: return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case RESOURCE_VIEW.ACTIVE: return resources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
      case RESOURCE_VIEW.COMPLETED: return resources.filter((r) => r.status === RESOURCE_STATUS.COMPLETED);
      case RESOURCE_VIEW.FAVORITE: return resources.filter((r) => r.favorite);
      case RESOURCE_VIEW.ARCHIVED: return archivedResources;
      default: return resources;
    }
  })();

  const resourceGroupsByTopic = (): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const id = r.topic_id ?? "unassigned";
      const cur = grouped.get(id) ?? [];
      cur.push(r);
      grouped.set(id, cur);
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Topic" : (topicNames.get(id) ?? id),
      resources: rs,
    }));
  };

  const resourceGroupsByArea = (): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedAreaIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Area" : (areaNames.get(id) ?? id),
      resources: rs,
    }));
  };

  const resourceGroupsByGoal = (): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedGoalIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Goal" : (goalNames.get(id) ?? id),
      resources: rs,
    }));
  };

  const resourceGroupsByProject = (): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedProjectIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Project" : (projNames.get(id) ?? id),
      resources: rs,
    }));
  };

  const handleNewResourceForGroup = (tab: ResourceView, groupId: string) => {
    setEditingResource(null);
    if (tab === RESOURCE_VIEW.BY_AREA) {
      setResourcePrefill({ areaIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_GOAL) {
      setResourcePrefill({ goalIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_PROJECT) {
      setResourcePrefill({ projectId: groupId });
    } else if (tab === RESOURCE_VIEW.BY_TOPIC) {
      setResourcePrefill({ topicId: groupId });
    } else {
      setResourcePrefill({});
    }
    setResourceCreateOpen(true);
  };

  function renderResourceRow(r: Resource) {
    const areas = getResourceLinkedAreaIds(r)
      .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
      .filter((a): a is { name: string; icon: string | null } => Boolean(a.name));
    const goalNamesList = getResourceLinkedGoalIds(r)
      .map((id) => goalNames.get(id))
      .filter((n): n is string => Boolean(n));
    const projectNamesList = getResourceLinkedProjectIds(r)
      .map((id) => projNames.get(id))
      .filter((n): n is string => Boolean(n));
    const taskNamesList = getResourceLinkedTaskIds(r)
      .map((id) => allTasks.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return (
      <ResourceRow
        key={r.id}
        resource={r}
        areas={areas}
        goalNames={goalNamesList}
        projectNames={projectNamesList}
        taskNames={taskNamesList}
        topicName={r.topic_id ? topicNames.get(r.topic_id) : undefined}
        onToggleFavorite={(id, fav) => onToggleFavorite(id, fav)}
        onSaveStatusChange={(id, saved) => onUpdateResource(id, { status: saved ? "completed" : "inbox" })}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
        onEdit={(res) => setEditingResource(res)}
      />
    );
  }

  function renderResourcesList(list: Resource[]) {
    return (
      <div className="rounded-lg border border-border">
        {list.map((r) => renderResourceRow(r))}
      </div>
    );
  }

  function getAreasForResource(r: Resource) {
    return getResourceLinkedAreaIds(r)
      .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
      .filter((a): a is { name: string; icon: string | null } => Boolean(a.name));
  }
  function getGoalNamesForResource(r: Resource) {
    return getResourceLinkedGoalIds(r)
      .map((id) => goalNames.get(id))
      .filter((n): n is string => Boolean(n));
  }
  function getProjectNamesForResource(r: Resource) {
    return getResourceLinkedProjectIds(r)
      .map((id) => projNames.get(id))
      .filter((n): n is string => Boolean(n));
  }
  function getTaskNamesForResource(r: Resource) {
    return getResourceLinkedTaskIds(r)
      .map((id) => allTasks.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }

  const groupViewProps = {
    getAreas: getAreasForResource,
    getGoalNames: getGoalNamesForResource,
    getProjectNames: getProjectNamesForResource,
    getTaskNames: getTaskNamesForResource,
    getTopicName: (r: Resource) => r.topic_id ? topicNames.get(r.topic_id) : undefined,
    onToggleFavorite,
    onArchive,
    onUnarchive,
    onDelete,
    onEdit: (r: Resource) => setEditingResource(r),
  };

  return (
    <>
      <section>
        <SectionHeader
          accentClass="bg-emerald-500"
          title="Resources"
          totalCount={resources.length}
          description="Access and search your latest Resources."
          buttonLabel="New Resource"
          onNew={() => setResourceCreateOpen(true)}
          isPending={createResourceIsPending}
        />
        <div className="mt-4">
          <Tabs value={resourcesTab} onValueChange={setResourcesTab}>
            <TabsList className="mb-6 w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain">
              <TabsTrigger value={RESOURCE_VIEW.ALL} className="">All
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.INBOX} className=""><InboxIcon className="mr-1.5 size-3.5" />Inbox
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.TO_REVIEW} className=""><Clock className="mr-1.5 size-3.5" />To Review
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.ACTIVE} className=""><Zap className="mr-1.5 size-3.5" />Active
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.FAVORITE} className=""><Heart className="mr-1.5 size-3.5" />Favorites
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.BY_TOPIC} className=""><Tag className="mr-1.5 size-3.5" />By Topic</TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.BY_AREA} className=""><MapIcon className="mr-1.5 size-3.5" />By Area</TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.BY_GOAL} className=""><Target className="mr-1.5 size-3.5" />By Goal</TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.BY_PROJECT} className=""><FolderOpen className="mr-1.5 size-3.5" />By Project</TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.COMPLETED} className=""><Bookmark className="mr-1.5 size-3.5" />Completed
              </TabsTrigger>
              <TabsTrigger value={RESOURCE_VIEW.ARCHIVED} className=""><Archive className="mr-1.5 size-3.5" />Archived
              </TabsTrigger>
            </TabsList>

            {([RESOURCE_VIEW.ALL, RESOURCE_VIEW.INBOX, RESOURCE_VIEW.TO_REVIEW, RESOURCE_VIEW.ACTIVE, RESOURCE_VIEW.FAVORITE, RESOURCE_VIEW.COMPLETED, RESOURCE_VIEW.ARCHIVED] as ResourceView[]).map((v) => (
              <TabsContent key={v} value={v} className="mt-4">
                {resourcesLoading && v !== RESOURCE_VIEW.ARCHIVED ? (
                  <div className="flex flex-col">
                    {Array.from({ length: 5 }).map((_, i) => <ResourceRowSkeleton key={i} />)}
                  </div>
                ) : filteredResources.length === 0 ? (
                  <EmptyState
                    icon={Globe}
                    title={v === RESOURCE_VIEW.ALL ? "No resources yet" : "No resources"}
                    description={v === RESOURCE_VIEW.ALL ? "Add your first resource to get started" : "Try a different filter"}
                    actionLabel={v === RESOURCE_VIEW.ALL ? "New Resource" : undefined}
                    onAction={v === RESOURCE_VIEW.ALL ? () => setResourceCreateOpen(true) : undefined}
                  />
                ) : (
                  renderResourcesList(filteredResources)
                )}
              </TabsContent>
            ))}

            <TabsContent value={RESOURCE_VIEW.BY_TOPIC} className="mt-4">
              <ResourcesByGroupView
                groups={resourceGroupsByTopic()}
                {...groupViewProps}
                onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_TOPIC, groupId)}
                emptyMessage="Resources will be grouped by topic here."
              />
            </TabsContent>
            <TabsContent value={RESOURCE_VIEW.BY_AREA} className="mt-4">
              <ResourcesByGroupView
                groups={resourceGroupsByArea()}
                {...groupViewProps}
                onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_AREA, groupId)}
                emptyMessage="Resources will be grouped by area here."
              />
            </TabsContent>
            <TabsContent value={RESOURCE_VIEW.BY_GOAL} className="mt-4">
              <ResourcesByGroupView
                groups={resourceGroupsByGoal()}
                {...groupViewProps}
                onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_GOAL, groupId)}
                emptyMessage="Resources will be grouped by goal here."
              />
            </TabsContent>
            <TabsContent value={RESOURCE_VIEW.BY_PROJECT} className="mt-4">
              <ResourcesByGroupView
                groups={resourceGroupsByProject()}
                {...groupViewProps}
                onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_PROJECT, groupId)}
                emptyMessage="Resources will be grouped by project here."
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ── Resource Create / Edit Dialog ───────────────────────────────────── */}
      <ResourceDialog
        open={resourceCreateOpen || !!editingResource}
        onOpenChange={(open) => {
          if (!open) {
            setResourceCreateOpen(false);
            setEditingResource(null);
            setResourcePrefill({});
          }
        }}
        resource={editingResource}
        initialAreaIds={resourcePrefill.areaIds}
        initialGoalIds={resourcePrefill.goalIds}
        initialProjectId={resourcePrefill.projectId}
        initialTopicId={resourcePrefill.topicId}
        onSubmit={async (input) => {
          if (editingResource) {
            await onUpdateResource(editingResource.id, input as Record<string, unknown>);
            setEditingResource(null);
          } else {
            await onCreateResource(input as CreateResourceInput);
            setResourceCreateOpen(false);
            setResourcePrefill({});
          }
        }}
        isPending={createResourceIsPending || updateResourceIsPending}
      />
    </>
  );
}
