"use client";

import { useMemo, useState } from "react";
import { Tag, FilePlus, Heart, Globe, LayoutGrid, X, Archive } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopicCard } from "@/components/entities/topic-card";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useToggleFavoriteTopic,
  useArchiveTopic,
  useRestoreTopic,
  useArchivedTopics,
} from "@/lib/hooks/use-topics";
import { useAreas } from "@/lib/hooks/use-areas";
import { useNotes } from "@/lib/hooks/use-notes";
import { useResources } from "@/lib/hooks/use-resources";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { cn } from "@/lib/utils";

interface TopicForm {
  name: string;
  area_ids: string[];
  note_ids: string[];
  resource_ids: string[];
  favorite: boolean;
}

const defaultForm: TopicForm = { name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false };

function TopicCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="size-8" />
      </div>
      <div className="mt-3 flex gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function TopicsContent() {
  const [tab, setTab] = useState("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<TopicWithCounts | null>(null);
  const [form, setForm] = useState<TopicForm>(defaultForm);

  const { data: topics = [], isLoading } = useTopics();
  const { data: areas = [] } = useAreas();

  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const toggleFavorite = useToggleFavoriteTopic();
  const archiveTopic = useArchiveTopic();
  const restoreTopic = useRestoreTopic();
  const { data: archivedTopics = [] } = useArchivedTopics();

  const { data: allNotes = [] } = useNotes({ includeArchived: false });
  const { data: allResources = [] } = useResources({});

  const availableNotes = useMemo(() => {
    if (form.resource_ids.length > 0) {
      const selectedResources = form.resource_ids
        .map((id) => allResources.find((r) => r.id === id))
        .filter(Boolean) as typeof allResources;
      const allowedAreaIds = new Set(selectedResources.map((r) => r.area_id).filter(Boolean) as string[]);
      const allowedProjectIds = new Set(selectedResources.map((r) => r.project_id).filter(Boolean) as string[]);
      if (allowedAreaIds.size === 0 && allowedProjectIds.size === 0) return allNotes;
      return allNotes.filter((n) =>
        (n.area_id && allowedAreaIds.has(n.area_id)) ||
        (n.project_id && allowedProjectIds.has(n.project_id))
      );
    }
    if (form.area_ids.length > 0) {
      return allNotes.filter((n) => form.area_ids.includes(n.area_id ?? ""));
    }
    return allNotes;
  }, [allNotes, allResources, form.resource_ids, form.area_ids]);

  const availableResources = useMemo(() => {
    if (form.note_ids.length > 0) {
      const selectedNotes = form.note_ids
        .map((id) => allNotes.find((n) => n.id === id))
        .filter(Boolean) as typeof allNotes;
      const allowedAreaIds = new Set(selectedNotes.map((n) => n.area_id).filter(Boolean) as string[]);
      const allowedProjectIds = new Set(selectedNotes.map((n) => n.project_id).filter(Boolean) as string[]);
      if (allowedAreaIds.size === 0 && allowedProjectIds.size === 0) return allResources;
      return allResources.filter((r) =>
        (r.area_id && allowedAreaIds.has(r.area_id)) ||
        (r.project_id && allowedProjectIds.has(r.project_id))
      );
    }
    if (form.area_ids.length > 0) {
      return allResources.filter((r) => form.area_ids.includes(r.area_id ?? ""));
    }
    return allResources;
  }, [allResources, allNotes, form.note_ids, form.area_ids]);

  const filteredAreas = useMemo(() => {
    if (form.note_ids.length > 0) {
      const allowedAreaIds = new Set(
        form.note_ids
          .map((id) => availableNotes.find((n) => n.id === id)?.area_id)
          .filter((id): id is string => Boolean(id))
      );
      return allowedAreaIds.size > 0 ? areas.filter((a) => allowedAreaIds.has(a.id)) : areas;
    }
    if (form.resource_ids.length > 0) {
      const allowedAreaIds = new Set(
        form.resource_ids
          .map((id) => availableResources.find((r) => r.id === id)?.area_id)
          .filter((id): id is string => Boolean(id))
      );
      return allowedAreaIds.size > 0 ? areas.filter((a) => allowedAreaIds.has(a.id)) : areas;
    }
    return areas;
  }, [areas, form.note_ids, form.resource_ids, availableNotes, availableResources]);

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

  const areaIcons = useMemo(
    () => new Map(areas.map((a) => [a.id, (a.icon as string | null | undefined) ?? null])),
    [areas]
  );

  const activeTopics = useMemo(
    () => topics.filter((t) => !t.inactive),
    [topics]
  );

  const favoriteTopics = useMemo(
    () => topics.filter((t) => t.favorite),
    [topics]
  );

  const inactiveTopics = useMemo(
    () => topics.filter((t) => t.inactive),
    [topics]
  );

  const duplicateIndices = useMemo(() => {
    const result = new Map<string, number>();
    const grouped = new Map<string, TopicWithCounts[]>();

    for (const topic of topics) {
      if (!grouped.has(topic.name)) {
        grouped.set(topic.name, []);
      }
      grouped.get(topic.name)!.push(topic);
    }

    for (const group of grouped.values()) {
      if (group.length < 2) continue;

      const byCreationOrder = [...group].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );

      byCreationOrder.forEach((topic, index) => {
        result.set(topic.id, index + 1);
      });
    }

    return result;
  }, [topics]);

  const groupedByArea = useMemo(() => {
    const grouped = new Map<string, { areaName: string; topics: TopicWithCounts[] }>();
    for (const topic of topics) {
      const areaIds = topic.linkedAreaIds ?? [];
      if (areaIds.length === 0) {
        const unknown = grouped.get("__none__") ?? { areaName: "No Area", topics: [] };
        if (!unknown.topics.find((t) => t.id === topic.id)) {
          unknown.topics.push(topic);
        }
        grouped.set("__none__", unknown);
      } else {
        for (const areaId of areaIds) {
          const areaName = areaNames.get(areaId) ?? areaId;
          const entry = grouped.get(areaId) ?? { areaName, topics: [] };
          if (!entry.topics.find((t) => t.id === topic.id)) {
            entry.topics.push(topic);
          }
          grouped.set(areaId, entry);
        }
      }
    }
    return Array.from(grouped.entries())
      .filter(([key]) => key !== "__none__")
      .sort(([, a], [, b]) => a.areaName.localeCompare(b.areaName))
      .map(([areaId, { areaName, topics: areaTopics }]) => ({ areaId, areaName, topics: areaTopics }));
  }, [topics, areaNames]);

  const handleCreate = async () => {
    await createTopic.mutateAsync({
      name: form.name,
      area_ids: form.area_ids,
      note_ids: form.note_ids,
      resource_ids: form.resource_ids,
      favorite: form.favorite,
    });
    setForm(defaultForm);
    setIsCreateOpen(false);
  };

  const handleEdit = (topic: TopicWithCounts) => {
    setEditTopic(topic);
    setForm({
      name: topic.name,
      area_ids: topic.linkedAreaIds ?? [],
      note_ids: [],
      resource_ids: [],
      favorite: topic.favorite,
    });
  };

  const handleUpdate = async () => {
    if (!editTopic) return;
    await updateTopic.mutateAsync({
      id: editTopic.id,
      input: {
        name: form.name,
        area_ids: form.area_ids,
        note_ids: form.note_ids,
        resource_ids: form.resource_ids,
        favorite: form.favorite,
      },
    });
    setEditTopic(null);
    setForm(defaultForm);
  };

  const handleToggleFavorite = (id: string, favorite: boolean) => {
    toggleFavorite.mutate({ id, favorite });
  };

  const handleArchive = (topic: TopicWithCounts) => {
    archiveTopic.mutate(topic.id);
  };

  const handleRestore = (topic: TopicWithCounts) => {
    restoreTopic.mutate(topic.id);
  };

  const handleAreaToggle = (areaId: string) => {
    setForm((prev) => ({
      ...prev,
      area_ids: prev.area_ids.includes(areaId)
        ? prev.area_ids.filter((id) => id !== areaId)
        : [...prev.area_ids, areaId],
    }));
  };

  const handleNoteToggle = (noteId: string) => {
    setForm((prev) => ({
      ...prev,
      note_ids: prev.note_ids.includes(noteId)
        ? prev.note_ids.filter((id) => id !== noteId)
        : [...prev.note_ids, noteId],
    }));
  };

  const handleResourceToggle = (resourceId: string) => {
    setForm((prev) => ({
      ...prev,
      resource_ids: prev.resource_ids.includes(resourceId)
        ? prev.resource_ids.filter((id) => id !== resourceId)
        : [...prev.resource_ids, resourceId],
    }));
  };

  const renderTopicList = (
    list: TopicWithCounts[],
    emptyTitle: string,
    emptyDesc: string,
    emptyAction?: () => void
  ) => {
    if (isLoading) {
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <EmptyState
          icon={Tag}
          title={emptyTitle}
          description={emptyDesc}
          actionLabel={emptyAction ? "New Topic" : undefined}
          onAction={emptyAction}
        />
      );
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            areaNames={areaNames}
            areaIcons={areaIcons}
            duplicateIndex={duplicateIndices.get(topic.id)}
            onToggleFavorite={handleToggleFavorite}
            onEdit={handleEdit}
            onArchive={handleArchive}
          />
        ))}
      </div>
    );
  };

  const countLabel = (count: number) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
        {count}
      </Badge>
    ) : null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
          <p className="text-sm text-muted-foreground">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={createTopic.isPending}>
          <FilePlus className="mr-2 size-4" />
          New Topic
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Active
            {countLabel(activeTopics.length)}
          </TabsTrigger>
          <TabsTrigger value="favorite" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Heart className="mr-1 size-3" />
            Favorite
            {countLabel(favoriteTopics.length)}
          </TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Inactive
            {countLabel(inactiveTopics.length)}
          </TabsTrigger>
          <TabsTrigger value="by_area" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Globe className="mr-1 size-3" />
            By Area
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <LayoutGrid className="mr-1 size-3" />
            All
            {countLabel(topics.length)}
          </TabsTrigger>
          <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Archive className="mr-1 size-3" />
            Archived
            {countLabel(archivedTopics.length)}
          </TabsTrigger>
        </TabsList>

        {/* Active */}
        <TabsContent value="active" className="mt-4">
          {renderTopicList(activeTopics, "No active topics", "Link notes or resources to activate topics")}
        </TabsContent>

        {/* Favorite */}
        <TabsContent value="favorite" className="mt-4">
          {renderTopicList(favoriteTopics, "No favorite topics", "Star topics to see them here")}
        </TabsContent>

        {/* Inactive */}
        <TabsContent value="inactive" className="mt-4">
          {renderTopicList(inactiveTopics, "No inactive topics", "Topics with no linked items appear here")}
        </TabsContent>

        {/* By Area */}
        <TabsContent value="by_area" className="mt-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <TopicCardSkeleton key={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupedByArea.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No topics linked to areas"
              description="Link topics to areas to see them grouped here"
              actionLabel="New Topic"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {groupedByArea.map(({ areaId, areaName, topics: areaTopics }) => (
                <div key={areaId}>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="size-4 text-muted-foreground" />
                    <h2 className="font-semibold">{areaName}</h2>
                    <Badge variant="secondary" className="text-xs">{areaTopics.length}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {areaTopics.map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        areaNames={areaNames}
                        areaIcons={areaIcons}
                        duplicateIndex={duplicateIndices.get(topic.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All - Gallery */}
        <TabsContent value="all" className="mt-4">
          {renderTopicList(
            topics,
            "No topics yet",
            "Create your first topic to get started",
            () => setIsCreateOpen(true)
          )}
        </TabsContent>

        {/* Archived */}
        <TabsContent value="archived" className="mt-4">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <TopicCardSkeleton key={i} />)}
            </div>
          ) : archivedTopics.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No archived topics"
              description="Archived topics will appear here"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  areaNames={areaNames}
                  areaIcons={areaIcons}
                  duplicateIndex={duplicateIndices.get(topic.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      {(isCreateOpen || editTopic) && (
        <Dialog
          open={!!isCreateOpen || !!editTopic}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditTopic(null);
              setForm(defaultForm);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editTopic ? "Edit Topic" : "New Topic"}</DialogTitle>
              <DialogDescription>
                {editTopic ? "Update topic details" : "Create a topic to organize notes and resources"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="topic-name">Name</Label>
                <Input
                  id="topic-name"
                  placeholder="e.g., Productivity, Machine Learning, Recipes"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Linked Areas</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {form.area_ids.length === 0 ? "Select areas..." : `${form.area_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setForm((prev) => ({ ...prev, area_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {filteredAreas.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-2 py-1.5">
                            {form.note_ids.length > 0 || form.resource_ids.length > 0
                              ? "No areas match selected items"
                              : "No areas available"}
                          </p>
                        ) : (
                          filteredAreas.map((area) => {
                            const isSelected = form.area_ids.includes(area.id);
                            return (
                              <DropdownMenuItem
                                key={area.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => handleAreaToggle(area.id)}
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                {area.name}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {form.area_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.area_ids
                      .map((id) => areas.find((a) => a.id === id))
                      .filter((a): a is NonNullable<typeof a> => Boolean(a))
                      .map((area) => (
                        <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                          {area.name}
                          <button
                            type="button"
                            onClick={() => handleAreaToggle(area.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
                {areas.length === 0 && (
                  <p className="text-sm text-muted-foreground">No areas available</p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Link Notes</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {form.note_ids.length === 0 ? "Select notes..." : `${form.note_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setForm((prev) => ({ ...prev, note_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {availableNotes.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No notes available.
                          </div>
                        ) : (
                          availableNotes.map((note) => (
                            <DropdownMenuItem
                              key={note.id}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => handleNoteToggle(note.id)}
                              className="flex items-center gap-2"
                            >
                              <Checkbox checked={form.note_ids.includes(note.id)} readOnly />
                              <span className="truncate">{note.name}</span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {form.note_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.note_ids
                      .map((id) => availableNotes.find((n) => n.id === id))
                      .filter((n): n is NonNullable<typeof n> => Boolean(n))
                      .map((note) => (
                        <Badge key={note.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{note.name}</span>
                          <button
                            type="button"
                            onClick={() => handleNoteToggle(note.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Link Resources</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {form.resource_ids.length === 0 ? "Select resources..." : `${form.resource_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setForm((prev) => ({ ...prev, resource_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {availableResources.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No resources available.
                          </div>
                        ) : (
                          availableResources.map((resource) => (
                            <DropdownMenuItem
                              key={resource.id}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => handleResourceToggle(resource.id)}
                              className="flex items-center gap-2"
                            >
                              <Checkbox checked={form.resource_ids.includes(resource.id)} readOnly />
                              <span className="truncate">{resource.name}</span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {form.resource_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.resource_ids
                      .map((id) => availableResources.find((r) => r.id === id))
                      .filter((r): r is NonNullable<typeof r> => Boolean(r))
                      .map((resource) => (
                        <Badge key={resource.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{resource.name}</span>
                          <button
                            type="button"
                            onClick={() => handleResourceToggle(resource.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, favorite: !prev.favorite }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    form.favorite
                      ? "border-rose-500 bg-rose-500/10 text-rose-500"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-rose-500/40"
                  )}
                >
                  <Heart className={cn("size-3.5", form.favorite && "fill-current")} />
                  Favorite
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditTopic(null);
                  setForm(defaultForm);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editTopic ? handleUpdate : handleCreate}
                disabled={!form.name || (editTopic ? updateTopic.isPending : createTopic.isPending)}
              >
                {editTopic ? "Save Changes" : "Create Topic"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
