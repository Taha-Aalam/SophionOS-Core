"use client";

import { useMemo, useState } from "react";
import { Tag, FilePlus, Heart, Globe, Map as MapIcon, LayoutGrid, Archive, CircleDot, CircleOff, ChevronDownIcon, ChevronRightIcon, Plus } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicCard } from "@/components/entities/topic-card";
import { TopicDialog } from "@/components/entities/topic-dialog";
import { GalleryGrid } from "@/components/views/gallery-grid";
import {
  useTopics,
  useToggleFavoriteTopic,
  useArchiveTopic,
  useRestoreTopic,
  useArchivedTopics,
} from "@/lib/hooks/use-topics";
import { useAreas } from "@/lib/hooks/use-areas";
import type { TopicWithCounts } from "@/lib/services/topic.service";

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

function CollapsibleTopicGroup({
  areaId,
  areaName,
  areaIcon,
  topics: areaTopics,
  areaNames,
  areaIcons,
  duplicateIndices,
  onToggleFavorite,
  onEdit,
  onArchive,
  onCreateNew,
  defaultOpen = true,
}: {
  areaId: string;
  areaName: string;
  areaIcon: string | null;
  topics: TopicWithCounts[];
  areaNames: Map<string, string>;
  areaIcons: Map<string, string | null>;
  duplicateIndices: Map<string, number>;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onEdit: (topic: TopicWithCounts) => void;
  onArchive: (topic: TopicWithCounts) => void;
  onCreateNew: (areaId: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
        className="w-full flex items-center gap-2 mb-3 group cursor-pointer"
      >
        <span className="text-muted-foreground">
          {isOpen ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </span>
        {areaIcon ? (
          <span className="text-base leading-none">{areaIcon}</span>
        ) : (
          <MapIcon className="size-4 text-muted-foreground" />
        )}
        <Badge variant="outline" className="text-xs font-medium">
          {areaName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({areaTopics.length} {areaTopics.length === 1 ? "topic" : "topics"})
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onCreateNew(areaId);
          }}
          title={`Create topic in ${areaName}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isOpen && (
        <GalleryGrid>
          {areaTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              areaNames={areaNames}
              areaIcons={areaIcons}
              duplicateIndex={duplicateIndices.get(topic.id)}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onArchive={onArchive}
            />
          ))}
          <button
            onClick={() => onCreateNew(areaId)}
            className="flex flex-col items-center justify-center gap-2 h-full min-h-[120px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">New Topic</span>
          </button>
        </GalleryGrid>
      )}
    </div>
  );
}

export function TopicsContent() {
  const [tab, setTab] = useState("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<TopicWithCounts | null>(null);
  const [defaultAreaIdFromCreate, setDefaultAreaIdFromCreate] = useState<string | undefined>();

  const { data: topics = [], isLoading, isError, refetch } = useTopics();
  const { data: areas = [] } = useAreas();

  const toggleFavorite = useToggleFavoriteTopic();
  const archiveTopic = useArchiveTopic();
  const restoreTopic = useRestoreTopic();
  const { data: archivedTopics = [] } = useArchivedTopics();

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
    const grouped = new Map<string, { areaName: string; areaIcon: string | null; topics: TopicWithCounts[] }>();
    for (const topic of topics) {
      const areaIds = topic.linkedAreaIds ?? [];
      if (areaIds.length === 0) {
        const unknown = grouped.get("__none__") ?? { areaName: "No Area", areaIcon: null, topics: [] };
        if (!unknown.topics.find((t) => t.id === topic.id)) {
          unknown.topics.push(topic);
        }
        grouped.set("__none__", unknown);
      } else {
        for (const areaId of areaIds) {
          const areaName = areaNames.get(areaId) ?? areaId;
          const areaIcon = areaIcons.get(areaId) ?? null;
          const entry = grouped.get(areaId) ?? { areaName, areaIcon, topics: [] };
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
      .map(([areaId, { areaName, areaIcon, topics: areaTopics }]) => ({ areaId, areaName, areaIcon, topics: areaTopics }));
  }, [topics, areaNames, areaIcons]);

  const handleCreateInArea = (areaId: string) => {
    setDefaultAreaIdFromCreate(areaId);
    setIsCreateOpen(true);
  };

  const handleEdit = (topic: TopicWithCounts) => {
    setEditTopic(topic);
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

  const renderTopicList = (
    list: TopicWithCounts[],
    emptyTitle: string,
    emptyDesc: string,
    emptyAction?: () => void
  ) => {
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <ErrorState message="Failed to load topics." onRetry={() => refetch()} />
        </div>
      );
    }

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

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">🏷️</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
            <p className="text-sm text-muted-foreground">
              {topics.length} {topics.length === 1 ? "topic" : "topics"}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <FilePlus className="mr-2 size-4" />
          New Topic
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <CircleDot className="mr-1 size-3" />
            Active
          </TabsTrigger>
          <TabsTrigger value="favorite" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Heart className="mr-1 size-3" />
            Favorite
          </TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <CircleOff className="mr-1 size-3" />
            Inactive
          </TabsTrigger>
          <TabsTrigger value="by_area" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <MapIcon className="mr-1 size-3" />
            By Area
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <LayoutGrid className="mr-1 size-3" />
            All
          </TabsTrigger>
          <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Archive className="mr-1 size-3" />
            Archived
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
            <div className="px-1">
              {groupedByArea.map(({ areaId, areaName, areaIcon, topics: areaTopics }) => (
                <CollapsibleTopicGroup
                  key={areaId}
                  areaId={areaId}
                  areaName={areaName}
                  areaIcon={areaIcon}
                  topics={areaTopics}
                  areaNames={areaNames}
                  areaIcons={areaIcons}
                  duplicateIndices={duplicateIndices}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onCreateNew={handleCreateInArea}
                />
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
      <TopicDialog
        open={isCreateOpen || !!editTopic}
        onOpenChange={(o) => {
          if (!o) {
            setIsCreateOpen(false);
            setEditTopic(null);
            setDefaultAreaIdFromCreate(undefined);
          }
        }}
        topic={editTopic ?? undefined}
        defaultAreaId={isCreateOpen ? defaultAreaIdFromCreate : undefined}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditTopic(null);
          setDefaultAreaIdFromCreate(undefined);
        }}
      />
    </div>
  );
}
