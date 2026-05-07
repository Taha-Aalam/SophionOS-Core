"use client";

import { useState, useMemo } from "react";
import { FilePlus, Globe, Heart } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { ResourceRow, ResourceRowSkeleton } from "@/components/entities/resource-row";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useCreateResource,
  useResources,
  useToggleFavoriteResource,
  useUpdateResource,
  useArchivedResources,
  useFavoriteResources,
  useArchiveResource,
  useUnarchiveResource,
} from "@/lib/hooks/use-resources";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "@/lib/types/domain.types";
import { RESOURCE_STATUS, type ResourceStatus } from "@/lib/utils/constants";

export default function ResourcesPage() {
  const [tab, setTab] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const { data: allResources = [], isLoading } = useResources({ status: "all" });
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: favoriteResources = [] } = useFavoriteResources();
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({});
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasks = [] } = useTasks();
  const { data: topics = [] } = useTopics();

  const createResource = useCreateResource();
  const toggleFavorite = useToggleFavoriteResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const goalNames = useMemo(() => new Map(goals.map((g) => [g.id, g.name])), [goals]);
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const taskNames = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);
  const topicNames = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "inbox":
        return allResources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case "to_review":
        return allResources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case "favorites":
        return allResources.filter((r) => r.favorite);
      case "archive":
        return archivedResources;
      case "all":
        return allResources;
      default:
        return allResources;
    }
  }, [tab, allResources, archivedResources]);

  const byTopic = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of allResources) {
      if (r.topic_id) {
        const list = map.get(r.topic_id) ?? [];
        list.push(r);
        map.set(r.topic_id, list);
      }
    }
    return map;
  }, [allResources]);

  const handleCreate = async (input: CreateResourceInput) => {
    await createResource.mutateAsync(input);
    setDialogOpen(false);
  };

  const handleUpdate = async (input: UpdateResourceInput) => {
    if (!editingResource) return;
    await updateResource.mutateAsync({ id: editingResource.id, input });
    setDialogOpen(false);
    setEditingResource(null);
  };

  const handleToggleFavorite = (id: string, favorite: boolean) => {
    toggleFavorite.mutate({ id, favorite });
  };

  const handleArchive = (id: string) => {
    archiveResource.mutate(id);
  };

  const handleUnarchive = (id: string) => {
    unarchiveResource.mutate(id);
  };

  const handleStatusChange = (id: string, status: ResourceStatus) => {
    updateResource.mutate({ id, input: { status } });
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingResource(null);
    setDialogOpen(true);
  };

  const countForTab = (tabValue: string) => {
    switch (tabValue) {
      case "inbox":
        return allResources.filter((r) => r.status === RESOURCE_STATUS.INBOX).length;
      case "to_review":
        return allResources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW).length;
      case "favorites":
        return allResources.filter((r) => r.favorite).length;
      case "all":
        return allResources.length;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            {allResources.length} {allResources.length === 1 ? "resource" : "resources"}
          </p>
        </div>
        <Button onClick={handleOpenCreate} disabled={createResource.isPending}>
          <FilePlus className="mr-2 size-4" />
          New Resource
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {countForTab("all") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("all")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox
            {countForTab("inbox") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("inbox")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="to_review">
            To Review
            {countForTab("to_review") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("to_review")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="mr-1 size-3" />
            Favorites
            {countForTab("favorites") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("favorites")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="by_topics">By Topics</TabsTrigger>
          <TabsTrigger value="archive">
            Archive
            {archivedResources.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {archivedResources.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Inbox, To Review, Favorites, Archive, All — table view */}
        {["inbox", "to_review", "favorites", "archive", "all"].includes(tab) && (
          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex flex-col">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ResourceRowSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={
                  tab === "inbox"
                    ? "No resources in inbox"
                    : tab === "to_review"
                      ? "No resources to review"
                      : tab === "favorites"
                        ? "No favorite resources"
                        : tab === "archive"
                          ? "No archived resources"
                          : "No resources yet"
                }
                description={
                  tab === "all" ? "Add your first resource to get started" : "Try a different filter"
                }
                actionLabel={tab === "all" ? "New Resource" : undefined}
                onAction={tab === "all" ? handleOpenCreate : undefined}
              />
            ) : (
              <div className="rounded-lg border border-border">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
                  <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
                  <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
                  <span className="w-24 text-xs font-medium text-muted-foreground hidden md:inline">Topic</span>
                  <span className="w-20 text-xs font-medium text-muted-foreground hidden sm:inline">Type</span>
                  <span className="w-24 text-xs font-medium text-muted-foreground hidden lg:inline">Area</span>
                  <span className="w-24 text-xs font-medium text-muted-foreground hidden xl:inline">Goals</span>
                  <span className="w-24 text-xs font-medium text-muted-foreground hidden xl:inline">Projects</span>
                  <span className="w-24 text-xs font-medium text-muted-foreground hidden xl:inline">Tasks</span>
                  <span className="w-8" />
                  <span className="w-8" />
                  <span className="w-8" />
                </div>
                {/* Rows */}
                {filtered.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areaName={
                      resource.linkedAreaIds && resource.linkedAreaIds.length > 0
                        ? resource.linkedAreaIds.map((id) => areaNames.get(id)).filter((n): n is string => Boolean(n))
                        : resource.area_id
                          ? [areaNames.get(resource.area_id)].filter((n): n is string => Boolean(n))
                          : undefined
                    }
                    goalNames={
                      resource.linkedGoalIds && resource.linkedGoalIds.length > 0
                        ? resource.linkedGoalIds.map((id) => goalNames.get(id)).filter((n): n is string => Boolean(n))
                        : undefined
                    }
                    projectName={resource.project_id ? projectNames.get(resource.project_id) : undefined}
                    taskNames={
                      resource.linkedTaskIds && resource.linkedTaskIds.length > 0
                        ? resource.linkedTaskIds.map((id) => taskNames.get(id)).filter((n): n is string => Boolean(n))
                        : undefined
                    }
                    topicName={resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
                    onToggleFavorite={handleToggleFavorite}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* By Topics */}
        <TabsContent value="by_topics" className="mt-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted mb-3" />
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <ResourceRowSkeleton key={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : byTopic.size === 0 ? (
            <EmptyState
              icon={Globe}
              title="No resources linked to topics"
              description="Link resources to topics to see them grouped here"
              actionLabel="New Resource"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from(byTopic.entries()).map(([topicId, resources]) => {
                const name = topicNames.get(topicId) ?? "Unknown";
                return (
                  <div key={topicId} className="rounded-lg border border-border">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                      <Badge variant="secondary" className="text-xs">{name}</Badge>
                      <span className="text-xs text-muted-foreground">{resources.length} resources</span>
                    </div>
                    <div className="divide-y divide-border">
                      {resources.map((resource) => (
                        <ResourceRow
                          key={resource.id}
                          resource={resource}
                          areaName={
                            resource.linkedAreaIds && resource.linkedAreaIds.length > 0
                              ? resource.linkedAreaIds.map((id) => areaNames.get(id)).filter((n): n is string => Boolean(n))
                              : resource.area_id
                                ? [areaNames.get(resource.area_id)].filter((n): n is string => Boolean(n))
                                : undefined
                          }
                          goalNames={
                            resource.linkedGoalIds && resource.linkedGoalIds.length > 0
                              ? resource.linkedGoalIds.map((id) => goalNames.get(id)).filter((n): n is string => Boolean(n))
                              : undefined
                          }
                          projectName={resource.project_id ? projectNames.get(resource.project_id) : undefined}
                          taskNames={
                            resource.linkedTaskIds && resource.linkedTaskIds.length > 0
                              ? resource.linkedTaskIds.map((id) => taskNames.get(id)).filter((n): n is string => Boolean(n))
                              : undefined
                          }
                          topicName={name}
                          onToggleFavorite={handleToggleFavorite}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ResourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
        onSubmit={(input) => {
          if (editingResource) {
            handleUpdate(input as UpdateResourceInput);
          } else {
            handleCreate(input as CreateResourceInput);
          }
        }}
        isPending={createResource.isPending || updateResource.isPending}
      />
    </div>
  );
}