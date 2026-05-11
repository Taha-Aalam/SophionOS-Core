"use client";

import { useState, useMemo } from "react";
import { Archive, ChevronDownIcon, Eye, FilePlus, Filter, Globe, Heart, Inbox as InboxIcon, Tag, Zap } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RESOURCE_STATUS, type ResourceStatus, RESOURCE_TYPE } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

export default function ResourcesPage() {
  const [tab, setTab] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const [filterType, setFilterType] = useState<string>("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterTaskIds, setFilterTaskIds] = useState<string[]>([]);
  const [filterTopicIds, setFilterTopicIds] = useState<string[]>([]);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [goalPopoverOpen, setGoalPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const [topicPopoverOpen, setTopicPopoverOpen] = useState(false);

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

  const areaMap = useMemo(
    () => new Map(areas.map((a) => [a.id, { name: a.name, icon: a.icon ?? null }])),
    [areas],
  );
  const goalNames = useMemo(() => new Map(goals.map((g) => [g.id, g.name])), [goals]);
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const taskNames = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);
  const topicNames = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);

  const activeAreas = areas.filter((area) => !area.archive);
  const activeGoals = goals.filter((goal) => !goal.is_archived);
  const activeTasks = tasks.filter((task) => !task.is_archived);
  const activeTopics = topics.filter((topic) => !topic.inactive);

  const filtered = useMemo(() => {
    let result = allResources;

    switch (tab) {
      case "inbox":
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
        break;
      case "to_review":
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
        break;
      case "active":
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
        break;
      case "favorites":
        result = allResources.filter((r) => r.favorite);
        break;
      case "archive":
        result = archivedResources;
        break;
      default:
        break;
    }

    if (filterType) {
      result = result.filter((r) => r.type === filterType);
    }

    if (filterAreaIds.length > 0) {
      result = result.filter((r) => {
        const linked = r.linkedAreaIds ?? [];
        const primary = r.area_id ? [r.area_id] : [];
        const allAreaIds = Array.from(new Set([...primary, ...linked]));
        return filterAreaIds.some((id) => allAreaIds.includes(id));
      });
    }

    if (filterGoalIds.length > 0) {
      result = result.filter((r) => {
        const linked = r.linkedGoalIds ?? [];
        return filterGoalIds.some((id) => linked.includes(id));
      });
    }

    if (filterTaskIds.length > 0) {
      result = result.filter((r) => {
        const linked = r.linkedTaskIds ?? [];
        return filterTaskIds.some((id) => linked.includes(id));
      });
    }

    if (filterTopicIds.length > 0) {
      result = result.filter((r) => {
        const primary = r.topic_id ? [r.topic_id] : [];
        return filterTopicIds.some((id) => primary.includes(id));
      });
    }

    return result;
  }, [
    tab,
    allResources,
    archivedResources,
    filterType,
    filterAreaIds,
    filterGoalIds,
    filterTaskIds,
    filterTopicIds,
  ]);

  const hasFilters = Boolean(
    filterType ||
      filterAreaIds.length > 0 ||
      filterGoalIds.length > 0 ||
      filterTaskIds.length > 0 ||
      filterTopicIds.length > 0,
  );

  const selectedAreaLabels = filterAreaIds
    .map((id) => activeAreas.find((a) => a.id === id))
    .filter(Boolean)
    .map(
      (a) =>
        `${(a as { icon?: string }).icon ? `${(a as { icon?: string }).icon} ` : ""}${(a as { name: string }).name}`,
    );

  const selectedGoalLabels = filterGoalIds
    .map((id) => activeGoals.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => (g as { name: string }).name);

  const selectedTaskLabels = filterTaskIds
    .map((id) => activeTasks.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => (t as { name: string }).name);

  const selectedTopicLabels = filterTopicIds
    .map((id) => activeTopics.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => (t as { name: string }).name);

  const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
  const filterOptionClassName =
    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
  const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

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
      case "active":
        return allResources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE).length;
      case "favorites":
        return allResources.filter((r) => r.favorite).length;
      case "all":
        return allResources.length;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
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
        <TabsList className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            All
            {countForTab("all") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("all")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <InboxIcon className="mr-1.5 size-3.5" />
            Inbox
            {countForTab("inbox") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("inbox")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="to_review" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Eye className="mr-1.5 size-3.5" />
            To Review
            {countForTab("to_review") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("to_review")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Zap className="mr-1.5 size-3.5" />
            Active
            {countForTab("active") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("active")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Heart className="mr-1.5 size-3.5" />
            Favorites
            {countForTab("favorites") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("favorites")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="by_topics" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Tag className="mr-1.5 size-3.5" />
            By Topics
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Archive className="mr-1.5 size-3.5" />
            Archive
            {archivedResources.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {archivedResources.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3 border-b border-border/30 py-3">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterType || "__all_type__"}
              onValueChange={(value) =>
                setFilterType(value === "__all_type__" ? "" : (value ?? ""))
              }
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all_type__">All types</SelectItem>
                <SelectItem value={RESOURCE_TYPE.WEBSITE}>Website</SelectItem>
                <SelectItem value={RESOURCE_TYPE.ARTICLE}>Article</SelectItem>
                <SelectItem value={RESOURCE_TYPE.VIDEO}>Video</SelectItem>
                <SelectItem value={RESOURCE_TYPE.DOCUMENT}>Document</SelectItem>
                <SelectItem value={RESOURCE_TYPE.PODCAST}>Podcast</SelectItem>
                <SelectItem value={RESOURCE_TYPE.SOCIAL_MEDIA}>Social Media</SelectItem>
                <SelectItem value={RESOURCE_TYPE.TOOL}>Tool</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterAreaIds.length === 0 ? (
                  "Area"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedAreaLabels[0]}</span>
                    {selectedAreaLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedAreaLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeAreas.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No areas available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeAreas.map((area) => {
                      const checked = filterAreaIds.includes(area.id);
                      return (
                        <label key={area.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterAreaIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, area.id]))
                                  : prev.filter((id) => id !== area.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>
                            {area.icon ? `${area.icon} ` : ""}
                            {area.name}
                          </span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={goalPopoverOpen} onOpenChange={setGoalPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterGoalIds.length === 0 ? (
                  "Goal"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedGoalLabels[0]}</span>
                    {selectedGoalLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedGoalLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeGoals.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No goals available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeGoals.map((goal) => {
                      const checked = filterGoalIds.includes(goal.id);
                      return (
                        <label key={goal.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterGoalIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, goal.id]))
                                  : prev.filter((id) => id !== goal.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{goal.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterTaskIds.length === 0 ? (
                  "Task"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedTaskLabels[0]}</span>
                    {selectedTaskLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedTaskLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeTasks.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No tasks available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeTasks.map((task) => {
                      const checked = filterTaskIds.includes(task.id);
                      return (
                        <label key={task.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterTaskIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, task.id]))
                                  : prev.filter((id) => id !== task.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{task.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={topicPopoverOpen} onOpenChange={setTopicPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterTopicIds.length === 0 ? (
                  "Topic"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedTopicLabels[0]}</span>
                    {selectedTopicLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedTopicLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeTopics.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No topics available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeTopics.map((topic) => {
                      const checked = filterTopicIds.includes(topic.id);
                      return (
                        <label key={topic.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterTopicIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, topic.id]))
                                  : prev.filter((id) => id !== topic.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{topic.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterAreaIds([]);
                  setFilterGoalIds([]);
                  setFilterTaskIds([]);
                  setFilterTopicIds([]);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Inbox, To Review, Favorites, Archive, All — table view */}
        {["inbox", "to_review", "active", "favorites", "archive", "all"].includes(tab) && (
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
                      : tab === "active"
                        ? "No active resources"
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
                {/* Rows */}
                {filtered.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areas={
                      resource.linkedAreaIds && resource.linkedAreaIds.length > 0
                        ? resource.linkedAreaIds.map((id) => areaMap.get(id)).filter((a): a is { name: string; icon: string | null } => Boolean(a))
                        : resource.area_id
                          ? [areaMap.get(resource.area_id)].filter((a): a is { name: string; icon: string | null } => Boolean(a))
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
                    <div className="divide-y divide-border">
                      {resources.map((resource) => (
                        <ResourceRow
                          key={resource.id}
                          resource={resource}
areas={
                              resource.linkedAreaIds && resource.linkedAreaIds.length > 0
                                ? resource.linkedAreaIds.map((id) => areaMap.get(id)).filter((a): a is { name: string; icon: string | null } => Boolean(a))
                                : resource.area_id
                                  ? [areaMap.get(resource.area_id)].filter((a): a is { name: string; icon: string | null } => Boolean(a))
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