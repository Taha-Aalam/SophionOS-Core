"use client";

import { useMemo, useState } from "react";
import { Tag, FilePlus, Heart, Globe, LayoutGrid } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useTopic,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  useToggleFavoriteTopic,
} from "@/lib/hooks/use-topics";
import { useAreas } from "@/lib/hooks/use-areas";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { cn } from "@/lib/utils";

interface TopicForm {
  name: string;
  area_ids: string[];
  favorite: boolean;
}

const defaultForm: TopicForm = { name: "", area_ids: [], favorite: false };

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



export default function TopicsPage() {
  const [tab, setTab] = useState("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<TopicWithCounts | null>(null);
  const [form, setForm] = useState<TopicForm>(defaultForm);

  const { data: topics = [], isLoading } = useTopics();
  const { data: areas = [] } = useAreas();

  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const toggleFavorite = useToggleFavoriteTopic();

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

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
        favorite: form.favorite,
      },
    });
    setEditTopic(null);
    setForm(defaultForm);
  };

  const handleToggleFavorite = (id: string, favorite: boolean) => {
    toggleFavorite.mutate({ id, favorite });
  };

  const handleDelete = (topic: TopicWithCounts) => {
    if (confirm(`Delete topic "${topic.name}"?`)) {
      deleteTopic.mutate(topic.id);
    }
  };

  const handleAreaToggle = (areaId: string) => {
    setForm((prev) => ({
      ...prev,
      area_ids: prev.area_ids.includes(areaId)
        ? prev.area_ids.filter((id) => id !== areaId)
        : [...prev.area_ids, areaId],
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
            duplicateIndex={duplicateIndices.get(topic.id)}
            onToggleFavorite={handleToggleFavorite}
            onEdit={handleEdit}
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
                <Label>Linked Areas</Label>
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => handleAreaToggle(area.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        form.area_ids.includes(area.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {area.name}
                    </button>
                  ))}
                </div>
                {areas.length === 0 && (
                  <p className="text-sm text-muted-foreground">No areas available</p>
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