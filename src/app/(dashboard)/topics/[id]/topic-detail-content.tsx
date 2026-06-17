"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDownIcon,
  ChevronRightIcon,
  Heart,
  Tag,
  Archive,
  Plus,
} from "lucide-react";

import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { ResourceRow } from "@/components/entities/resource-row";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useTopic,
  useNotesForTopic,
  useResourcesForTopic,
  useToggleFavoriteTopic,
  useDeleteTopic,
  useUpdateTopic,
  useArchiveTopic,
} from "@/lib/hooks/use-topics";
import { useToggleFavoriteResource, useResources, useCreateResource, useUpdateResource, useArchiveResource, useUnarchiveResource, useDeleteResource } from "@/lib/hooks/use-resources";
import { NoteRow } from "@/components/entities/note-row";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import type { Resource, CreateResourceInput, UpdateResourceInput } from "@/lib/types/domain.types";
import { useArchiveNote, useDeleteNote, useNotes, useRestoreNote, useToggleFavoriteNote, useTogglePinNote, useUpdateNote } from "@/lib/hooks/use-notes";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useAreas } from "@/lib/hooks/use-areas";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
import { getNoteLinkedAreaIds, getNoteLinkedGoalIds, getNoteLinkedProjectIds } from "@/lib/utils/notes";
import { getResourceLinkedProjectIds } from "@/lib/utils/resources";
import { useUIStore } from "@/lib/stores/ui.store";
import { buildReturnToChain, popReturnToHref } from "@/lib/utils/return-to";
import { cn } from "@/lib/utils";

export function TopicDetailContent() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id as string;
  const { setPageTitle } = useUIStore();

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [noteTab, setNoteTab] = useState("all");
  const [resourceTab, setResourceTab] = useState("all");
  const [isLinkNoteOpen, setIsLinkNoteOpen] = useState(false);
  const [isLinkResourceOpen, setIsLinkResourceOpen] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);

  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const resolvedTopicId = topic?.id ?? "";
  const { data: notes = [], isLoading: notesLoading } = useNotesForTopic(resolvedTopicId);
  const { data: resources = [], isLoading: resourcesLoading } = useResourcesForTopic(resolvedTopicId);
  const { data: areas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();
  const toggleFavorite = useToggleFavoriteTopic();
  const deleteTopic = useDeleteTopic();
  const updateTopic = useUpdateTopic();
  const archiveTopic = useArchiveTopic();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const deleteResource = useDeleteResource();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const togglePinNote = useTogglePinNote();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const { data: allNotes = [] } = useNotes({ includeArchived: false });
  const { data: allResources = [] } = useResources({});

  const searchParams = useSearchParams();
  const backHref = popReturnToHref(searchParams, "/topics");
  useEscapeBack(backHref);

  useEffect(() => {
    if (topic) {
      setPageTitle(topic.name);
    }
    return () => setPageTitle("");
  }, [topic, setPageTitle]);

  const handleToggleFavorite = () => {
    if (!topic) return;
    toggleFavorite.mutate({ id: topic.id, favorite: !topic.favorite });
  };

  const handleDelete = async () => {
    if (!topic) return;
    await deleteTopic.mutateAsync(topic.id);
    router.push(backHref);
  };

  const handleArchive = async () => {
    if (!topic) return;
    await archiveTopic.mutateAsync(topic.id);
    router.push(backHref);
  };

  const handleLinkNotes = async () => {
    if (!topic || selectedNoteIds.length === 0) return;
    await updateTopic.mutateAsync({ id: topic.id, input: { note_ids: selectedNoteIds } });
    setSelectedNoteIds([]);
    setIsLinkNoteOpen(false);
  };

  const handleLinkResources = async () => {
    if (!topic || selectedResourceIds.length === 0) return;
    await updateTopic.mutateAsync({ id: topic.id, input: { resource_ids: selectedResourceIds } });
    setSelectedResourceIds([]);
    setIsLinkResourceOpen(false);
  };

  const handleResourceSubmit = async (input: CreateResourceInput | UpdateResourceInput) => {
    if (editResource) {
      await updateResource.mutateAsync({ id: editResource.id, input: input as UpdateResourceInput });
    } else {
      await createResource.mutateAsync(input as CreateResourceInput);
    }
    setIsResourceDialogOpen(false);
    setEditResource(null);
  };

  const handleNewNote = useCallback(() => {
    const urlParams = new URLSearchParams({ returnTo: `/topics/${topicId}` });
    const chain = buildReturnToChain(searchParams);
    if (chain) {
      urlParams.set("chain", chain);
    }
    if (topic?.linkedAreaIds && topic.linkedAreaIds.length > 0) {
      urlParams.set("areaIds", topic.linkedAreaIds.join(","));
    }
    urlParams.set("topicId", topic?.id ?? topicId);
    router.push(`/notes/new?${urlParams.toString()}`);
  }, [router, topicId, topic, searchParams]);

  const linkedAreas = useMemo(() => {
    if (!topic?.linkedAreaIds) return [];
    return topic.linkedAreaIds
      .map((id) => {
        const area = areas.find((a) => a.id === id);
        return area ? { id, name: area.name, icon: (area.icon as string | null | undefined) ?? null } : null;
      })
      .filter(Boolean) as { id: string; name: string; icon: string | null }[];
  }, [topic, areas]);

  const areaNamesMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIconsMap = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
  const goalNamesMap = useMemo(() => new Map(allGoals.map((g) => [g.id, g.name])), [allGoals]);
  const projectNamesMap = useMemo(() => new Map(allProjects.map((p) => [p.id, p.name])), [allProjects]);
  const taskNamesMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t.name])), [allTasks]);
  const linkableNotes = useMemo(() => {
    const linkedNoteIds = new Set(notes.map((n) => n.id));
    const unlinked = allNotes.filter((n) => !linkedNoteIds.has(n.id));
    if (!topic?.linkedAreaIds?.length) return unlinked;
    return unlinked.filter((n) => topic.linkedAreaIds!.includes(n.area_id ?? ""));
  }, [allNotes, notes, topic]);

  const linkableResources = useMemo(() => {
    const linkedResourceIds = new Set(resources.map((r) => r.id));
    const unlinked = allResources.filter((r) => !linkedResourceIds.has(r.id));
    if (!topic?.linkedAreaIds?.length) return unlinked;
    return unlinked.filter((r) => topic.linkedAreaIds!.includes(r.area_id ?? ""));
  }, [allResources, resources, topic]);

  const noteTabs = useMemo(() => [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
  ], []);

  const filteredNotes = useMemo(() => {
    switch (noteTab) {
      case "inbox": return notes.filter((n) => n.status === "inbox" && !n.is_archived);
      case "to_review": return notes.filter((n) => n.status === "to_review" && !n.is_archived);
      case "active": return notes.filter((n) => n.status === "active" && !n.is_archived);
      case "completed": return notes.filter((n) => n.status === "completed" && !n.is_archived);
      case "archived": return notes.filter((n) => n.is_archived);
      default: return notes.filter((n) => !n.is_archived);
    }
  }, [notes, noteTab]);

  const resourceTabs = useMemo(() => [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
  ], []);

  const filteredResources = useMemo(() => {
    switch (resourceTab) {
      case "inbox": return resources.filter((r) => r.status === "inbox" && !r.is_archived);
      case "to_review": return resources.filter((r) => r.status === "to_review" && !r.is_archived);
      case "active": return resources.filter((r) => r.status === "active" && !r.is_archived);
      case "completed": return resources.filter((r) => r.status === "completed" && !r.is_archived);
      case "archived": return resources.filter((r) => r.is_archived);
      default: return resources.filter((r) => !r.is_archived);
    }
  }, [resources, resourceTab]);

  if (topicLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <EmptyState
          icon={Tag}
          title="Topic not found"
          description="This topic doesn't exist or you don't have access to it"
          actionLabel="Go Back"
          onAction={() => router.push(backHref)}
        />
      </div>
    );
  }

  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(backHref)}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <span>Topics</span>
        <span>/</span>
        <span className="text-foreground">{topic.name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Tag className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">{topic.name}</h1>
                {topic.inactive && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                )}
                {topic.favorite && (
                  <Heart className="size-4 fill-rose-500 text-rose-500" />
                )}
              </div>
              {linkedAreas.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {linkedAreas.map((area) => (
                    <Badge key={area.id} variant="secondary" className="text-xs">
                      {area.icon ? <span className="mr-0.5 text-[10px] leading-none">{area.icon}</span> : null}
                      {area.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesOpen((v) => !v)}
            className="gap-1 shrink-0"
          >
            Properties
            {isPropertiesOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {/* Rollup counts */}
        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            <span className="font-medium text-purple-600 dark:text-purple-400">{notes.length}</span>
            <span className="text-muted-foreground">Notes</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            <span className="font-medium text-orange-600 dark:text-orange-400">{resources.length}</span>
            <span className="text-muted-foreground">Resources</span>
          </div>
        </div>

        {/* Properties panel */}
        {isPropertiesOpen && (
          <>
            <Separator />
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Areas</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {linkedAreas.length > 0 ? (
                      linkedAreas.map((area) => (
                        <Badge key={area.id} variant="secondary">
                          {area.icon ? <span className="mr-0.5 text-[10px] leading-none">{area.icon}</span> : null}
                          {area.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1 font-medium">{topic.inactive ? "Inactive" : "Active"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Favorite</Label>
                  <p className="mt-1 font-medium">{topic.favorite ? "Yes" : "No"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleToggleFavorite}>
                  <Heart className={cn("size-4 mr-2", topic.favorite && "fill-rose-500 text-rose-500")} />
                  {topic.favorite ? "Unfavorite" : "Favorite"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleNewNote}>
                  <Plus className="size-4 mr-2" />
                  New Note
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedNoteIds([]); setIsLinkNoteOpen(true); }}>
                  <Plus className="size-4 mr-2" />
                  Link Note
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditResource(null); setIsResourceDialogOpen(true); }}>
                  <Plus className="size-4 mr-2" />
                  New Resource
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedResourceIds([]); setIsLinkResourceOpen(true); }}>
                  <Plus className="size-4 mr-2" />
                  Link Resource
                </Button>
                <Button variant="outline" size="sm" onClick={handleArchive} disabled={archiveTopic.isPending}>
                  <Archive className="size-4 mr-2" />
                  Archive
                </Button>
                <DeleteEntityPopover
                  variant="detail"
                  entityLabel="topic"
                  entityName={topic.name}
                  requireTypedConfirmation
                  disabled={deleteTopic.isPending}
                  onConfirm={() => {
                    void handleDelete();
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notes section */}
      <GoalDetailSection
        id="notes"
        entityType="notes"
        tabs={noteTabs}
        activeTab={noteTab}
        onTabChange={setNoteTab}
        isLoading={notesLoading}
        emptyTitle="No linked notes"
        emptyDescription="Notes linked to this topic will appear here."
        onCreateNew={handleNewNote}
        createLabel="New Note"
        onLinkExisting={() => { setSelectedNoteIds([]); setIsLinkNoteOpen(true); }}
        linkLabel="Link Note"
      >
        {filteredNotes.length > 0 ? (
          <div className="rounded-lg border bg-card">
            {filteredNotes.map((note) => {
              const noteReturnTo = `/topics/${topicId}`;
              const noteAreas = getNoteLinkedAreaIds(note)
                .map((id) => ({ name: areaNamesMap.get(id) ?? "", icon: areaIconsMap.get(id) ?? null }))
                .filter((a) => Boolean(a.name));
              const noteGoalNames = getNoteLinkedGoalIds(note)
                .map((id) => goalNamesMap.get(id))
                .filter((n): n is string => Boolean(n));
              const noteProjectNames = getNoteLinkedProjectIds(note)
                .map((id) => projectNamesMap.get(id))
                .filter((n): n is string => Boolean(n));
              const noteTaskNames = ((note as { linkedTaskIds?: string[] }).linkedTaskIds ?? [])
                .map((id: string) => taskNamesMap.get(id))
                .filter((n): n is string => Boolean(n));
              return (
                <NoteRow
                  key={note.id}
                  note={note}
                  returnTo={noteReturnTo}
                  areas={noteAreas}
                  goalNames={noteGoalNames}
                  projectNames={noteProjectNames}
                  taskNames={noteTaskNames}
                  onPinToggle={(id, pin) => togglePinNote.mutate({ id, pin })}
                  onFavoriteToggle={(id, favorite) => toggleFavoriteNote.mutate({ id, favorite })}
                  onSaveStatusChange={(id, saved) => updateNote.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                  onArchive={(id) => archiveNote.mutate(id)}
                  onRestore={(id) => restoreNote.mutate(id)}
                  onDelete={(id) => deleteNote.mutate(id)}
                />
              );
            })}
          </div>
        ) : null}
      </GoalDetailSection>

      {/* Resources section */}
      <GoalDetailSection
        id="resources"
        entityType="resources"
        tabs={resourceTabs}
        activeTab={resourceTab}
        onTabChange={setResourceTab}
        isLoading={resourcesLoading}
        emptyTitle="No linked resources"
        emptyDescription="Resources linked to this topic will appear here."
        onCreateNew={() => { setEditResource(null); setIsResourceDialogOpen(true); }}
        createLabel="New Resource"
        onLinkExisting={() => { setSelectedResourceIds([]); setIsLinkResourceOpen(true); }}
        linkLabel="Link Resource"
      >
        {filteredResources.length > 0 ? (
          <div className="rounded-lg border border-border">
            {filteredResources.map((resource) => {
              const resourceAreaIds = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                ? resource.linkedAreaIds
                : (resource.area_id ? [resource.area_id] : []);
              const resourceAreas = resourceAreaIds
                .map((id) => ({ name: areaNamesMap.get(id), icon: areaIconsMap.get(id) ?? null }))
                .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
              const resourceGoalNames = (resource.linkedGoalIds ?? [])
                .map((id) => goalNamesMap.get(id))
                .filter((name): name is string => Boolean(name));
              const resourceProjectNames = getResourceLinkedProjectIds(resource)
                .map((id) => projectNamesMap.get(id))
                .filter((n): n is string => Boolean(n));
              const resourceTaskNames = (resource.linkedTaskIds ?? [])
                .map((id) => taskNamesMap.get(id))
                .filter((name): name is string => Boolean(name));
              return (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  areas={resourceAreas}
                  goalNames={resourceGoalNames}
                  projectNames={resourceProjectNames}
                  taskNames={resourceTaskNames}
                  topicName={topic?.name}
                  onToggleFavorite={(id, favorite) =>
                    toggleFavoriteResource.mutate({ id, favorite })
                  }
                  onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                  onArchive={(id) => archiveResource.mutate(id)}
                  onUnarchive={(id) => unarchiveResource.mutate(id)}
                  onDelete={(id) => deleteResource.mutate(id)}
                  onEdit={(r) => { setEditResource(r); setIsResourceDialogOpen(true); }}
                />
              );
            })}
          </div>
        ) : null}
      </GoalDetailSection>

      {/* Link Note dialog */}
      <Dialog open={isLinkNoteOpen} onOpenChange={(open) => { if (!open) { setIsLinkNoteOpen(false); setSelectedNoteIds([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Note</DialogTitle>
            <DialogDescription>
              Select notes to link to this topic.
              {topic.linkedAreaIds?.length ? " Showing notes from linked areas only." : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72">
            {linkableNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-2">No notes available.</p>
            ) : (
              <div className="flex flex-col gap-1 py-1">
                {linkableNotes.map((note) => (
                  <label
                    key={note.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedNoteIds.includes(note.id)}
                      onCheckedChange={(checked) =>
                        setSelectedNoteIds((prev) =>
                          checked ? [...prev, note.id] : prev.filter((id) => id !== note.id)
                        )
                      }
                    />
                    <span className="text-sm truncate">{note.name}</span>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsLinkNoteOpen(false); setSelectedNoteIds([]); }}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkNotes}
              disabled={selectedNoteIds.length === 0 || updateTopic.isPending}
            >
              Link {selectedNoteIds.length > 0 ? `(${selectedNoteIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Resource dialog */}
      <Dialog open={isLinkResourceOpen} onOpenChange={(open) => { if (!open) { setIsLinkResourceOpen(false); setSelectedResourceIds([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Resource</DialogTitle>
            <DialogDescription>
              Select resources to link to this topic.
              {topic.linkedAreaIds?.length ? " Showing resources from linked areas only." : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72">
            {linkableResources.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-2">No resources available.</p>
            ) : (
              <div className="flex flex-col gap-1 py-1">
                {linkableResources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedResourceIds.includes(resource.id)}
                      onCheckedChange={(checked) =>
                        setSelectedResourceIds((prev) =>
                          checked ? [...prev, resource.id] : prev.filter((id) => id !== resource.id)
                        )
                      }
                    />
                    <span className="text-sm truncate">{resource.name}</span>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsLinkResourceOpen(false); setSelectedResourceIds([]); }}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkResources}
              disabled={selectedResourceIds.length === 0 || updateTopic.isPending}
            >
              Link {selectedResourceIds.length > 0 ? `(${selectedResourceIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource create/edit dialog */}
      <ResourceDialog
        open={isResourceDialogOpen}
        onOpenChange={(open) => {
          setIsResourceDialogOpen(open);
          if (!open) setEditResource(null);
        }}
        resource={editResource}
        initialTopicId={topic?.id ?? topicId}
        initialAreaIds={topic.linkedAreaIds}
        onSubmit={handleResourceSubmit}
        isPending={createResource.isPending || updateResource.isPending}
      />

    </div>
  );
}
