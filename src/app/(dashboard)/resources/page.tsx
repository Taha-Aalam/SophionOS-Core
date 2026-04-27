"use client";

import { useState, useMemo } from "react";
import { ExternalLink, FilePlus, Globe, Heart } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceRow, ResourceRowSkeleton } from "@/components/entities/resource-row";
import { useAreas } from "@/lib/hooks/use-areas";
import { useCreateResource, useResources, useToggleFavoriteResource, useUpdateResource, useArchivedResources, useFavoriteResources, useArchiveResource } from "@/lib/hooks/use-resources";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTopics } from "@/lib/hooks/use-topics";
import type { CreateResourceInput, Resource } from "@/lib/types/domain.types";
import { RESOURCE_STATUS, RESOURCE_TYPE, type ResourceStatus } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

const RESOURCE_TYPE_OPTIONS = [
  { value: RESOURCE_TYPE.WEBSITE, label: "Website" },
  { value: RESOURCE_TYPE.ARTICLE, label: "Article" },
  { value: RESOURCE_TYPE.VIDEO, label: "Video" },
  { value: RESOURCE_TYPE.DOCUMENT, label: "Document" },
  { value: RESOURCE_TYPE.PODCAST, label: "Podcast" },
  { value: RESOURCE_TYPE.SOCIAL_MEDIA, label: "Social Media" },
  { value: RESOURCE_TYPE.TOOL, label: "Tool" },
];

const RESOURCE_STATUS_OPTIONS = [
  { value: RESOURCE_STATUS.INBOX, label: "Inbox" },
  { value: RESOURCE_STATUS.TO_REVIEW, label: "To Review" },
  { value: RESOURCE_STATUS.ACTIVE, label: "Active" },
];

const TYPE_COLORS: Record<string, string> = {
  website: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  article: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  video: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  document: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  podcast: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  social_media: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  tool: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

interface NewResourceForm {
  name: string;
  url: string;
  type: string;
  area_id: string;
  project_id: string;
  topic_id: string;
  status: string;
}

const defaultForm: NewResourceForm = {
  name: "",
  url: "",
  type: RESOURCE_TYPE.WEBSITE,
  area_id: "",
  project_id: "",
  topic_id: "",
  status: RESOURCE_STATUS.INBOX,
};

export default function ResourcesPage() {
  const [tab, setTab] = useState<string>("inbox");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NewResourceForm>(defaultForm);

  const { data: allResources = [], isLoading } = useResources({ status: "all" });
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: favoriteResources = [] } = useFavoriteResources();
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: topics = [] } = useTopics();

  const createResource = useCreateResource();
  const toggleFavorite = useToggleFavoriteResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
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

  const handleCreate = async () => {
    const input: CreateResourceInput = {
      name: form.name,
      url: form.url || undefined,
      type: form.type as Resource["type"],
      status: form.status as ResourceStatus,
      area_id: form.area_id || undefined,
      project_id: form.project_id || undefined,
      topic_id: form.topic_id || undefined,
    };
    await createResource.mutateAsync(input);
    setForm(defaultForm);
    setIsCreateOpen(false);
  };

  const handleToggleFavorite = (id: string, favorite: boolean) => {
    toggleFavorite.mutate({ id, favorite });
  };

  const handleArchive = (id: string) => {
    archiveResource.mutate(id);
  };

  const handleStatusChange = (id: string, status: ResourceStatus) => {
    updateResource.mutate({ id, input: { status } });
  };

  const handleFormChange = (field: keyof NewResourceForm, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleUrlBlur = () => {
    if (form.url && !form.name) {
      try {
        const u = new URL(form.url);
        const host = u.hostname.replace(/^www\./, "");
        setForm((prev) => ({ ...prev, name: prev.url ? host : prev.name }));
      } catch {
        // invalid URL, keep name empty
      }
    }
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
        <Button onClick={() => setIsCreateOpen(true)} disabled={createResource.isPending}>
          <FilePlus className="mr-2 size-4" />
          New Resource
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
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
          <TabsTrigger value="all">
            All
            {countForTab("all") > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countForTab("all")}
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
                onAction={tab === "all" ? () => setIsCreateOpen(true) : undefined}
              />
            ) : (
              <div className="rounded-lg border border-border">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
                  <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
                  <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
                  <span className="w-20 text-xs font-medium text-muted-foreground hidden sm:inline">Type</span>
                  <span className="w-16 text-xs font-medium text-muted-foreground hidden md:inline">Topic</span>
                  <span className="w-16 text-xs font-medium text-muted-foreground hidden lg:inline">Area</span>
                  <span className="w-16 text-xs font-medium text-muted-foreground hidden xl:inline">Project</span>
                  <span className="w-8" />
                  <span className="w-8" />
                  <span className="w-8" />
                </div>
                {/* Rows */}
                {filtered.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areaName={resource.area_id ? areaNames.get(resource.area_id) : undefined}
                    projectName={resource.project_id ? projectNames.get(resource.project_id) : undefined}
                    topicName={resource.topic_id ? topicNames.get(resource.topic_id) : undefined}
                    onToggleFavorite={handleToggleFavorite}
                    onArchive={handleArchive}
                    onStatusChange={handleStatusChange}
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
              onAction={() => setIsCreateOpen(true)}
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
                          areaName={resource.area_id ? areaNames.get(resource.area_id) : undefined}
                          projectName={resource.project_id ? projectNames.get(resource.project_id) : undefined}
                          topicName={name}
                          onToggleFavorite={handleToggleFavorite}
                          onArchive={handleArchive}
                          onStatusChange={handleStatusChange}
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Resource</DialogTitle>
            <DialogDescription>Add an external reference to your PARA system</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="res-name">Name</Label>
              <Input
                id="res-name"
                placeholder="My favorite article"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-url">URL</Label>
              <Input
                id="res-url"
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => handleFormChange("url", e.target.value)}
                onBlur={handleUrlBlur}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                <SelectTrigger id="res-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => handleFormChange("status", v)}>
                <SelectTrigger id="res-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-area">Area</Label>
              <Select value={form.area_id} onValueChange={(v) => handleFormChange("area_id", v)}>
                <SelectTrigger id="res-area">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-project">Project</Label>
              <Select value={form.project_id} onValueChange={(v) => handleFormChange("project_id", v)}>
                <SelectTrigger id="res-project">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="res-topic">Topic</Label>
              <Select value={form.topic_id} onValueChange={(v) => handleFormChange("topic_id", v)}>
                <SelectTrigger id="res-topic">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!form.name || createResource.isPending}>
              Create Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}