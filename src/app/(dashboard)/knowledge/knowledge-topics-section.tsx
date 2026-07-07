"use client";

import { useState } from "react";
import {
  Archive,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDot,
  CircleOff,
  Globe,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  Plus,
  Tag,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicCard } from "@/components/entities/topic-card";
import { GalleryGrid } from "@/components/views/gallery-grid";
import { cn } from "@/lib/utils";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import type { Note, Resource } from "@/lib/types/domain.types";
import { SectionHeader } from "./knowledge-section-header";

// ─── CollapsibleTopicGroup ──────────────────────────────────────────────────
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
          {areaTopics.map((t) => (
            <TopicCard
              key={t.id}
              topic={t}
              areaNames={areaNames}
              areaIcons={areaIcons}
              duplicateIndex={duplicateIndices.get(t.id)}
              returnTo="/knowledge"
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

// ─── KnowledgeTopicsSection ─────────────────────────────────────────────────
export interface KnowledgeTopicsSectionProps {
  topics: TopicWithCounts[];
  topicsLoading: boolean;
  archivedTopics: TopicWithCounts[];
  areaNames: Map<string, string>;
  areaIcons: Map<string, string | null>;
  areas: { id: string; name: string; icon: string | null | undefined }[];
  notes: Note[];
  resources: Resource[];
  createTopicIsPending: boolean;
  updateTopicIsPending: boolean;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onCreateTopic: (input: { name: string; area_ids: string[]; note_ids: string[]; resource_ids: string[]; favorite: boolean }) => Promise<void>;
  onUpdateTopic: (id: string, input: { name: string; area_ids: string[]; note_ids: string[]; resource_ids: string[]; favorite: boolean }) => Promise<void>;
}

export function KnowledgeTopicsSection({
  topics,
  topicsLoading,
  archivedTopics,
  areaNames,
  areaIcons,
  areas,
  notes,
  resources,
  createTopicIsPending,
  updateTopicIsPending,
  onToggleFavorite,
  onArchive,
  onRestore,
  onCreateTopic,
  onUpdateTopic,
}: KnowledgeTopicsSectionProps) {
  const [topicsTab, setTopicsTab] = useState("active");
  const [topicCreateOpen, setTopicCreateOpen] = useState(false);
  const [topicEditData, setTopicEditData] = useState<TopicWithCounts | null>(null);
  const [topicForm, setTopicForm] = useState({
    name: "",
    area_ids: [] as string[],
    note_ids: [] as string[],
    resource_ids: [] as string[],
    favorite: false,
  });

  const activeTopics = topics.filter((t) => !t.inactive);
  const favoriteTopics = topics.filter((t) => t.favorite);
  const inactiveTopics = topics.filter((t) => t.inactive);

  const duplicateIndices = (() => {
    const result = new Map<string, number>();
    const grouped = new Map<string, TopicWithCounts[]>();
    for (const topic of topics) {
      if (!grouped.has(topic.name)) grouped.set(topic.name, []);
      grouped.get(topic.name)!.push(topic);
    }
    for (const group of grouped.values()) {
      if (group.length < 2) continue;
      [...group]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .forEach((t, i) => result.set(t.id, i + 1));
    }
    return result;
  })();

  const groupedTopicsByArea = (() => {
    const grouped = new Map<string, { areaName: string; topics: TopicWithCounts[] }>();
    for (const topic of topics) {
      const areaIds = topic.linkedAreaIds ?? [];
      if (areaIds.length === 0) {
        const g = grouped.get("__none__") ?? { areaName: "No Area", topics: [] };
        if (!g.topics.find((t) => t.id === topic.id)) g.topics.push(topic);
        grouped.set("__none__", g);
      } else {
        for (const areaId of areaIds) {
          const g = grouped.get(areaId) ?? { areaName: areaNames.get(areaId) ?? areaId, topics: [] };
          if (!g.topics.find((t) => t.id === topic.id)) g.topics.push(topic);
          grouped.set(areaId, g);
        }
      }
    }
    return Array.from(grouped.entries())
      .filter(([key]) => key !== "__none__")
      .sort(([, a], [, b]) => a.areaName.localeCompare(b.areaName))
      .map(([areaId, { areaName, topics: ts }]) => ({ areaId, areaName, topics: ts }));
  })();

  const openTopicCreate = () => {
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
    setTopicCreateOpen(true);
  };
  const openTopicCreateInArea = (areaId: string) => {
    setTopicForm({ name: "", area_ids: [areaId], note_ids: [], resource_ids: [], favorite: false });
    setTopicCreateOpen(true);
  };
  const handleTopicCreate = async () => {
    await onCreateTopic({
      name: topicForm.name,
      area_ids: topicForm.area_ids,
      note_ids: topicForm.note_ids,
      resource_ids: topicForm.resource_ids,
      favorite: topicForm.favorite,
    });
    setTopicCreateOpen(false);
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
  };
  const handleTopicEdit = (topic: TopicWithCounts) => {
    setTopicEditData(topic);
    setTopicForm({
      name: topic.name,
      area_ids: topic.linkedAreaIds ?? [],
      note_ids: [],
      resource_ids: [],
      favorite: topic.favorite,
    });
  };
  const handleTopicUpdate = async () => {
    if (!topicEditData) return;
    await onUpdateTopic(topicEditData.id, {
      name: topicForm.name,
      area_ids: topicForm.area_ids,
      note_ids: topicForm.note_ids,
      resource_ids: topicForm.resource_ids,
      favorite: topicForm.favorite,
    });
    setTopicEditData(null);
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
  };

  const toggleFav = (id: string, fav: boolean) => onToggleFavorite(id, fav);
  const archiveT = (topic: TopicWithCounts) => onArchive(topic.id);
  const restoreT = (topic: TopicWithCounts) => onRestore(topic.id);

  return (
    <>
    <section>
      <SectionHeader
        accentClass="bg-blue-500"
        title="Topics"
        totalCount={topics.length}
        description="Explore your library of Topics."
        buttonLabel="New Topic"
        onNew={openTopicCreate}
        isPending={createTopicIsPending}
      />
      <div className="mt-4">
          <Tabs value={topicsTab} onValueChange={setTopicsTab}>
            <TabsList className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <CircleDot className="mr-1 size-3" />Active
              </TabsTrigger>
              <TabsTrigger value="favorite" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Heart className="mr-1 size-3" />Favorite
              </TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <CircleOff className="mr-1 size-3" />Inactive
              </TabsTrigger>
              <TabsTrigger value="by_area" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <MapIcon className="mr-1 size-3" />By Area
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <LayoutGrid className="mr-1 size-3" />All
              </TabsTrigger>
              <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Archive className="mr-1 size-3" />Archived
              </TabsTrigger>
            </TabsList>

            {topicsLoading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="active" className="mt-4">
                  {activeTopics.length === 0
                    ? <EmptyState icon={Tag} title="No active topics" description="Link notes or resources to activate topics" />
                    : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {activeTopics.map((t) => (
                          <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                            returnTo="/knowledge"
                            onToggleFavorite={toggleFav}
                            onEdit={handleTopicEdit}
                            onArchive={archiveT} />
                        ))}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="favorite" className="mt-4">
                  {favoriteTopics.length === 0
                    ? <EmptyState icon={Heart} title="No favorite topics" description="Star topics to see them here" />
                    : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {favoriteTopics.map((t) => (
                          <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                            returnTo="/knowledge"
                            onToggleFavorite={toggleFav}
                            onEdit={handleTopicEdit}
                            onArchive={archiveT} />
                        ))}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="inactive" className="mt-4">
                  {inactiveTopics.length === 0
                    ? <EmptyState icon={Tag} title="No inactive topics" description="Topics with no linked items appear here" />
                    : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {inactiveTopics.map((t) => (
                          <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                            returnTo="/knowledge"
                            onToggleFavorite={toggleFav}
                            onEdit={handleTopicEdit}
                            onArchive={archiveT} />
                        ))}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="by_area" className="mt-4">
                  {groupedTopicsByArea.length === 0
                    ? <EmptyState icon={Globe} title="No topics linked to areas" description="Link topics to areas to see them grouped here" />
                    : (
                      <div className="px-1">
                        {groupedTopicsByArea.map(({ areaId, areaName, topics: areaTopics }) => {
                          const areaIcon = areaIcons.get(areaId) ?? null;
                          return (
                            <CollapsibleTopicGroup
                              key={areaId}
                              areaId={areaId}
                              areaName={areaName}
                              areaIcon={areaIcon}
                              topics={areaTopics}
                              areaNames={areaNames}
                              areaIcons={areaIcons}
                              duplicateIndices={duplicateIndices}
                              onToggleFavorite={toggleFav}
                              onEdit={handleTopicEdit}
                              onArchive={archiveT}
                              onCreateNew={openTopicCreateInArea}
                            />
                          );
                        })}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                  {topics.length === 0
                    ? <EmptyState icon={Tag} title="No topics yet" description="Create your first topic" actionLabel="New Topic" onAction={openTopicCreate} />
                    : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {topics.map((t) => (
                          <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                            returnTo="/knowledge"
                            onToggleFavorite={toggleFav}
                            onEdit={handleTopicEdit}
                            onArchive={archiveT} />
                        ))}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="archived" className="mt-4">
                  {archivedTopics.length === 0 ? (
                    <EmptyState icon={Archive} title="No archived topics" description="Archived topics will appear here" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {archivedTopics.map((t) => (
                        <TopicCard
                          key={t.id}
                          topic={t}
                          areaNames={areaNames}
                          areaIcons={areaIcons}
                          duplicateIndex={duplicateIndices.get(t.id)}
                          returnTo="/knowledge"
                          onToggleFavorite={toggleFav}
                          onRestore={restoreT}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </section>

      {/* ── Topic Create / Edit Dialog ──────────────────────────────────────── */}

      {(topicCreateOpen || !!topicEditData) && (
        <Dialog
          open={topicCreateOpen || !!topicEditData}
          onOpenChange={(open) => {
            if (!open) {
              setTopicCreateOpen(false);
              setTopicEditData(null);
              setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{topicEditData ? "Edit Topic" : "New Topic"}</DialogTitle>
              <DialogDescription>
                {topicEditData ? "Update topic details" : "Create a topic to organize notes and resources"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kh-topic-name">Name</Label>
                <Input
                  id="kh-topic-name"
                  placeholder="e.g., Productivity, Machine Learning, Recipes"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Linked Areas</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.area_ids.length === 0 ? "Select areas..." : `${topicForm.area_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, area_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {areas.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-2 py-1.5">No areas available</p>
                        ) : (
                          areas.map((area) => {
                            const isSelected = topicForm.area_ids.includes(area.id);
                            const icon = (area.icon as string | null | undefined) ?? null;
                            return (
                              <DropdownMenuItem
                                key={area.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    area_ids: isSelected
                                      ? p.area_ids.filter((id) => id !== area.id)
                                      : [...p.area_ids, area.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                {icon && <span className="text-sm leading-none">{icon}</span>}
                                {area.name}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.area_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.area_ids
                      .map((id) => areas.find((a) => a.id === id))
                      .filter((a): a is NonNullable<typeof a> => Boolean(a))
                      .map((area) => (
                        <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                          {area.icon ? `${area.icon} ` : ""}{area.name}
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                area_ids: p.area_ids.filter((id) => id !== area.id),
                              }))
                            }
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
                  <Label>Link Notes</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.note_ids.length === 0 ? "Select notes..." : `${topicForm.note_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, note_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {notes.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No notes available.</div>
                        ) : (
                          notes.map((note) => {
                            const isSelected = topicForm.note_ids.includes(note.id);
                            return (
                              <DropdownMenuItem
                                key={note.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    note_ids: isSelected
                                      ? p.note_ids.filter((id) => id !== note.id)
                                      : [...p.note_ids, note.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                <span className="truncate">{note.name}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.note_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.note_ids
                      .map((id) => notes.find((n) => n.id === id))
                      .filter((n): n is NonNullable<typeof n> => Boolean(n))
                      .map((note) => (
                        <Badge key={note.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{note.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                note_ids: p.note_ids.filter((id) => id !== note.id),
                              }))
                            }
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
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.resource_ids.length === 0 ? "Select resources..." : `${topicForm.resource_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, resource_ids: [] }))}>
                        Clear selection
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {resources.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No resources available.</div>
                        ) : (
                          resources.map((resource) => {
                            const isSelected = topicForm.resource_ids.includes(resource.id);
                            return (
                              <DropdownMenuItem
                                key={resource.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    resource_ids: isSelected
                                      ? p.resource_ids.filter((id) => id !== resource.id)
                                      : [...p.resource_ids, resource.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                <span className="truncate">{resource.name}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.resource_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.resource_ids
                      .map((id) => resources.find((r) => r.id === id))
                      .filter((r): r is NonNullable<typeof r> => Boolean(r))
                      .map((resource) => (
                        <Badge key={resource.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{resource.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                resource_ids: p.resource_ids.filter((id) => id !== resource.id),
                              }))
                            }
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
                  onClick={() => setTopicForm((p) => ({ ...p, favorite: !p.favorite }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    topicForm.favorite
                      ? "border-rose-500 bg-rose-500/10 text-rose-500"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-rose-500/40",
                  )}
                >
                  <Heart className={cn("size-3.5", topicForm.favorite && "fill-current")} />
                  Favorite
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTopicCreateOpen(false);
                  setTopicEditData(null);
                  setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={topicEditData ? handleTopicUpdate : handleTopicCreate}
                disabled={!topicForm.name || (topicEditData ? updateTopicIsPending : createTopicIsPending)}
              >
                {topicEditData ? "Save Changes" : "Create Topic"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
