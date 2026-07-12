"use client";

import { useCallback, useState, useMemo } from "react";
import { Archive, Bookmark, ChevronDownIcon, Eye, FilePlus, Filter, Folder, Globe, Heart, Inbox as InboxIcon, Map as LucideMap, Tag, Target, Zap } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
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
import { ResourceRow } from "@/components/entities/resource-row";
import { ResourceRowSkeleton } from "@/components/views/list-page-skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useCreateResource,
  useDeleteResource,
  useResources,
  useToggleFavoriteResource,
  useUpdateResource,
  useArchivedResources,
  useArchiveResource,
  useUnarchiveResource,
} from "@/lib/hooks/use-resources";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import { useAuth } from "@/components/providers/auth-provider";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "@/lib/types/domain.types";
import { RESOURCE_STATUS, RESOURCE_TYPE } from "@/lib/utils/constants";
import {
  RESOURCE_VIEW,
  type ResourceView,
  getResourceLinkedAreaIds,
  getResourceLinkedGoalIds,
  getResourceLinkedProjectIds,
  getResourceLinkedTaskIds,
} from "@/lib/utils/resources";
import { cn } from "@/lib/utils";

export function ResourcesContent() {
  const { isLoading: authLoading, user } = useAuth();
  const [tab, setTab] = useState<ResourceView>(RESOURCE_VIEW.ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [newResourceInitial, setNewResourceInitial] = useState<{
    areaIds?: string[];
    goalIds?: string[];
    projectId?: string;
    topicId?: string;
  }>({});

  const [filterType, setFilterType] = useState<string>("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterTaskIds, setFilterTaskIds] = useState<string[]>([]);
  const [filterTopicIds, setFilterTopicIds] = useState<string[]>([]);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [goalPopoverOpen, setGoalPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const [topicPopoverOpen, setTopicPopoverOpen] = useState(false);

  const { data: allResources = [], isLoading, isFetching, isError, refetch } = useResources({ status: "all" });
  // Show skeletons while auth resolves, user is absent, or any fetch is in
  // flight with no cached data. isFetching covers refetch/retry windows that
  // isLoading misses — prevents flashing to empty when data transiently clears.
  const isInitialLoad = authLoading || !user || (isFetching && allResources.length === 0);
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({});
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasksData } = useTasks();
  const tasks = useMemo(() => tasksData ?? [], [tasksData]);
  const { data: topics = [] } = useTopics();

  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();
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

  const getAreasForResource = useCallback(
    (resource: Resource) =>
      getResourceLinkedAreaIds(resource)
        .map((id) => areaMap.get(id))
        .filter((area): area is { name: string; icon: string | null } => Boolean(area)),
    [areaMap],
  );

  const getGoalNamesForResource = useCallback(
    (resource: Resource) =>
      getResourceLinkedGoalIds(resource)
        .map((id) => goalNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [goalNames],
  );

  const getProjectNamesForResource = useCallback(
    (resource: Resource) =>
      getResourceLinkedProjectIds(resource)
        .map((id) => projectNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [projectNames],
  );

  const getTaskNamesForResource = useCallback(
    (resource: Resource) =>
      getResourceLinkedTaskIds(resource)
        .map((id) => taskNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [taskNames],
  );

  const activeAreas = useMemo(() => areas.filter((area) => !area.archive), [areas]);
  const activeGoals = useMemo(() => goals.filter((goal) => !goal.is_archived), [goals]);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.is_archived), [tasks]);
  const activeTopics = useMemo(() => topics.filter((topic) => !topic.inactive), [topics]);

  const filtered = useMemo(() => {
    let result = allResources;

    switch (tab) {
      case RESOURCE_VIEW.INBOX:
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
        break;
      case RESOURCE_VIEW.TO_REVIEW:
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
        break;
      case RESOURCE_VIEW.ACTIVE:
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
        break;
      case RESOURCE_VIEW.COMPLETED:
        result = allResources.filter((r) => r.status === RESOURCE_STATUS.COMPLETED);
        break;
      case RESOURCE_VIEW.FAVORITE:
        result = allResources.filter((r) => r.favorite);
        break;
      case RESOURCE_VIEW.ARCHIVED:
        result = archivedResources;
        break;
      case RESOURCE_VIEW.BY_TOPIC:
      case RESOURCE_VIEW.BY_AREA:
      case RESOURCE_VIEW.BY_GOAL:
      case RESOURCE_VIEW.BY_PROJECT:
        result = [];
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

  const selectedAreaLabels = useMemo(
    () =>
      filterAreaIds
        .map((id) => activeAreas.find((a) => a.id === id))
        .filter(Boolean)
        .map(
          (a) =>
            `${(a as { icon?: string }).icon ? `${(a as { icon?: string }).icon} ` : ""}${(a as { name: string }).name}`,
        ),
    [filterAreaIds, activeAreas],
  );

  const selectedGoalLabels = useMemo(
    () =>
      filterGoalIds
        .map((id) => activeGoals.find((g) => g.id === id))
        .filter(Boolean)
        .map((g) => (g as { name: string }).name),
    [filterGoalIds, activeGoals],
  );

  const selectedTaskLabels = useMemo(
    () =>
      filterTaskIds
        .map((id) => activeTasks.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => (t as { name: string }).name),
    [filterTaskIds, activeTasks],
  );

  const selectedTopicLabels = useMemo(
    () =>
      filterTopicIds
        .map((id) => activeTopics.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => (t as { name: string }).name),
    [filterTopicIds, activeTopics],
  );

  const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
  const filterOptionClassName =
    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
  const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

  const resourceGroupsByTopic = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const resource of allResources.filter((item) => !item.is_archived)) {
      const topicId = resource.topic_id ?? "unassigned";
      const current = grouped.get(topicId) ?? [];
      current.push(resource);
      grouped.set(topicId, current);
    }
    return Array.from(grouped.entries()).map(([topicId, resources]) => ({
      groupId: topicId,
      groupName: topicId === "unassigned" ? "No Topic" : (topicNames.get(topicId) ?? topicId),
      resources,
    }));
  }, [allResources, topicNames]);

  const resourceGroupsByArea = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const resource of allResources.filter((item) => !item.is_archived)) {
      const areaIds = getResourceLinkedAreaIds(resource);
      const keys = areaIds.length > 0 ? areaIds : ["unassigned"];
      for (const areaId of keys) {
        const current = grouped.get(areaId) ?? [];
        current.push(resource);
        grouped.set(areaId, current);
      }
    }
    return Array.from(grouped.entries()).map(([areaId, resources]) => ({
      groupId: areaId,
      groupName: areaId === "unassigned" ? "No Area" : (areaMap.get(areaId)?.name ?? areaId),
      resources,
    }));
  }, [allResources, areaMap]);

  const resourceGroupsByGoal = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const resource of allResources.filter((item) => !item.is_archived)) {
      const goalIds = getResourceLinkedGoalIds(resource);
      const keys = goalIds.length > 0 ? goalIds : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(resource);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, resources]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (goalNames.get(goalId) ?? goalId),
      resources,
    }));
  }, [allResources, goalNames]);

  const resourceGroupsByProject = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const resource of allResources.filter((item) => !item.is_archived)) {
      const projectIds = getResourceLinkedProjectIds(resource);
      const keys = projectIds.length > 0 ? projectIds : ["unassigned"];
      for (const projectId of keys) {
        const current = grouped.get(projectId) ?? [];
        current.push(resource);
        grouped.set(projectId, current);
      }
    }
    return Array.from(grouped.entries()).map(([projectId, resources]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectNames.get(projectId) ?? projectId),
      resources,
    }));
  }, [allResources, projectNames]);

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

  const handleDelete = (id: string) => {
    deleteResource.mutate(id);
  };

  const handleSaveStatusChange = (id: string, saved: boolean) => {
    updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } });
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setNewResourceInitial({});
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingResource(null);
    setNewResourceInitial({});
    setDialogOpen(true);
  };

  const handleNewResourceForGroup = (tab: ResourceView, groupId: string) => {
    setEditingResource(null);
    if (tab === RESOURCE_VIEW.BY_AREA) {
      setNewResourceInitial({ areaIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_GOAL) {
      setNewResourceInitial({ goalIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_PROJECT) {
      setNewResourceInitial({ projectId: groupId });
    } else if (tab === RESOURCE_VIEW.BY_TOPIC) {
      setNewResourceInitial({ topicId: groupId });
    } else {
      setNewResourceInitial({});
    }
    setDialogOpen(true);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState message="Failed to load resources." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">🔗</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
            <p className="text-sm text-muted-foreground">
              {allResources.length} {allResources.length === 1 ? "resource" : "resources"}
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} disabled={createResource.isPending}>
          <FilePlus className="mr-2 size-4" />
          New Resource
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain">
          <TabsTrigger value={RESOURCE_VIEW.ALL}>
              All
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.INBOX} className="">
              <InboxIcon className="mr-1.5 size-3.5" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.TO_REVIEW} className="">
              <Eye className="mr-1.5 size-3.5" />
              To Review
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.ACTIVE} className="">
              <Zap className="mr-1.5 size-3.5" />
              Active
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.FAVORITE} className="">
              <Heart className="mr-1.5 size-3.5" />
              Favorite
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.BY_TOPIC} className="">
              <Tag className="mr-1.5 size-3.5" />
              By Topic
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.BY_AREA} className="">
              <LucideMap className="mr-1.5 size-3.5" />
              By Area
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.BY_GOAL} className="">
              <Target className="mr-1.5 size-3.5" />
              By Goal
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.BY_PROJECT} className="">
              <Folder className="mr-1.5 size-3.5" />
              By Project
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.COMPLETED} className="">
              <Bookmark className="mr-1.5 size-3.5" />
              Completed
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_VIEW.ARCHIVED} className="">
              <Archive className="mr-1.5 size-3.5" />
              Archived
            </TabsTrigger>
          </TabsList>

        <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterType || "__all_type__"}
              onValueChange={(value) =>
                setFilterType(value === "__all_type__" ? "" : (value ?? ""))
              }
            >
              <SelectTrigger className="h-10 sm:h-8 w-[140px] sm:w-48 text-xs">
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
                  "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterAreaIds.length === 0 ? (
                  "Area"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedAreaLabels[0]}</span>
                    {selectedAreaLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-2xs">
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
                  "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterGoalIds.length === 0 ? (
                  "Goal"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedGoalLabels[0]}</span>
                    {selectedGoalLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-2xs">
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
                  "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterTaskIds.length === 0 ? (
                  "Task"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedTaskLabels[0]}</span>
                    {selectedTaskLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-2xs">
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
                  "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterTopicIds.length === 0 ? (
                  "Topic"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedTopicLabels[0]}</span>
                    {selectedTopicLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-2xs">
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

        {/* Flat list views: All, Inbox, To Review, Active, Favorite, Saved, Archived */}
        {([RESOURCE_VIEW.ALL, RESOURCE_VIEW.INBOX, RESOURCE_VIEW.TO_REVIEW, RESOURCE_VIEW.ACTIVE, RESOURCE_VIEW.FAVORITE, RESOURCE_VIEW.COMPLETED, RESOURCE_VIEW.ARCHIVED] as ResourceView[]).includes(tab) && (
          <TabsContent value={tab} className="mt-0 flex-1">
            {isInitialLoad ? (
              <div className="flex flex-col">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ResourceRowSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={
                  tab === RESOURCE_VIEW.INBOX
                    ? "No resources in inbox"
                    : tab === RESOURCE_VIEW.TO_REVIEW
                      ? "No resources to review"
                      : tab === RESOURCE_VIEW.ACTIVE
                        ? "No active resources"
                        : tab === RESOURCE_VIEW.FAVORITE
                          ? "No favorite resources"
                          : tab === RESOURCE_VIEW.ARCHIVED
                            ? "No archived resources"
                            : tab === RESOURCE_VIEW.COMPLETED
                              ? "No completed resources"
                              : "No resources yet"
                }
                description={
                  tab === RESOURCE_VIEW.ALL ? "Add your first resource to get started" : "Try a different filter"
                }
                actionLabel={tab === RESOURCE_VIEW.ALL ? "New Resource" : undefined}
                onAction={tab === RESOURCE_VIEW.ALL ? handleOpenCreate : undefined}
              />
            ) : (
              filtered.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  areas={getAreasForResource(resource)}
                  goalNames={getGoalNamesForResource(resource)}
                  projectNames={getProjectNamesForResource(resource)}
                  taskNames={getTaskNamesForResource(resource)}
                  topicName={resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
                  onToggleFavorite={handleToggleFavorite}
                  onSaveStatusChange={handleSaveStatusChange}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))
            )}
          </TabsContent>
        )}

        {/* By Topic */}
        <TabsContent value={RESOURCE_VIEW.BY_TOPIC} className="mt-0 flex-1">
          <ResourcesByGroupView
            groups={resourceGroupsByTopic}
            getAreas={getAreasForResource}
            getGoalNames={getGoalNamesForResource}
            getProjectNames={getProjectNamesForResource}
            getTaskNames={getTaskNamesForResource}
            getTopicName={(resource) => resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
            onToggleFavorite={handleToggleFavorite}
            onSaveStatusChange={handleSaveStatusChange}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_TOPIC, groupId)}
            emptyMessage="Resources will be grouped by topic here."
          />
        </TabsContent>

        <TabsContent value={RESOURCE_VIEW.BY_AREA} className="mt-0 flex-1">
          <ResourcesByGroupView
            groups={resourceGroupsByArea}
            getAreas={getAreasForResource}
            getGoalNames={getGoalNamesForResource}
            getProjectNames={getProjectNamesForResource}
            getTaskNames={getTaskNamesForResource}
            getTopicName={(resource) => resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
            onToggleFavorite={handleToggleFavorite}
            onSaveStatusChange={handleSaveStatusChange}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_AREA, groupId)}
            emptyMessage="Resources will be grouped by area here."
          />
        </TabsContent>

        <TabsContent value={RESOURCE_VIEW.BY_GOAL} className="mt-0 flex-1">
          <ResourcesByGroupView
            groups={resourceGroupsByGoal}
            getAreas={getAreasForResource}
            getGoalNames={getGoalNamesForResource}
            getProjectNames={getProjectNamesForResource}
            getTaskNames={getTaskNamesForResource}
            getTopicName={(resource) => resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
            onToggleFavorite={handleToggleFavorite}
            onSaveStatusChange={handleSaveStatusChange}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_GOAL, groupId)}
            emptyMessage="Resources will be grouped by goal here."
          />
        </TabsContent>

        <TabsContent value={RESOURCE_VIEW.BY_PROJECT} className="mt-0 flex-1">
          <ResourcesByGroupView
            groups={resourceGroupsByProject}
            getAreas={getAreasForResource}
            getGoalNames={getGoalNamesForResource}
            getProjectNames={getProjectNamesForResource}
            getTaskNames={getTaskNamesForResource}
            getTopicName={(resource) => resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
            onToggleFavorite={handleToggleFavorite}
            onSaveStatusChange={handleSaveStatusChange}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_PROJECT, groupId)}
            emptyMessage="Resources will be grouped by project here."
          />
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
        initialAreaIds={newResourceInitial.areaIds}
        initialGoalIds={newResourceInitial.goalIds}
        initialProjectId={newResourceInitial.projectId}
        initialTopicId={newResourceInitial.topicId}
      />
    </div>
  );
}
