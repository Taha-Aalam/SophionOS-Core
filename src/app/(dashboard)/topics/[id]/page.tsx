"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, HeartOff, Globe, NotebookPen, Link, Edit2, Trash2, Tag } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopic, useNotesForTopic, useResourcesForTopic, useToggleFavoriteTopic, useDeleteTopic } from "@/lib/hooks/use-topics";
import { useAreas } from "@/lib/hooks/use-areas";
import { useAuth } from "@/components/providers/auth-provider";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const topicId = params.id as string;
  const { setPageTitle } = useUIStore();

  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: notes = [], isLoading: notesLoading } = useNotesForTopic(topicId);
  const { data: resources = [], isLoading: resourcesLoading } = useResourcesForTopic(topicId);
  const { data: areas = [] } = useAreas();
  const toggleFavorite = useToggleFavoriteTopic();
  const deleteTopic = useDeleteTopic();

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

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

  const handleDelete = () => {
    if (!topic) return;
    if (confirm(`Delete topic "${topic.name}"? This cannot be undone.`)) {
      deleteTopic.mutate(topic.id);
      router.push("/topics");
    }
  };

  const linkedAreaNames = useMemo(() => {
    if (!topic?.linkedAreaIds) return [];
    return topic.linkedAreaIds.map((id) => areaNames.get(id)).filter(Boolean) as string[];
  }, [topic, areaNames]);

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
          onAction={() => router.push("/topics")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/topics")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
            <Tag className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{topic.name}</h1>
              {topic.inactive && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </div>
            {linkedAreaNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Globe className="size-3.5 text-muted-foreground" />
                {linkedAreaNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
          >
            {topic.favorite ? (
              <>
                <Heart className="size-4 mr-2 fill-rose-500 text-rose-500" />
                Favorited
              </>
            ) : (
              <>
                <HeartOff className="size-4 mr-2" />
                Favorite
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <NotebookPen className="size-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{notes.length}</p>
            <p className="text-xs text-muted-foreground">Linked notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link className="size-4 text-muted-foreground" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resources.length}</p>
            <p className="text-xs text-muted-foreground">Linked resources</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{linkedAreaNames.length}</p>
            <p className="text-xs text-muted-foreground">Linked areas</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Linked Notes</h2>
        <Card>
          <CardContent className="p-4">
            {notesLoading ? (
              <div className="h-32 rounded-xl bg-muted animate-pulse" />
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes linked to this topic yet
              </p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => router.push(`/notes/${note.id}`)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                  >
                    <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{note.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="text-xs">{note.status}</Badge>
                        {note.notebook && <span>{note.notebook}</span>}
                        {note.area_id && areaNames.get(note.area_id) && (
                          <span>{areaNames.get(note.area_id)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">Linked Resources</h2>
        <Card>
          <CardContent className="p-4">
            {resourcesLoading ? (
              <div className="h-32 rounded-xl bg-muted animate-pulse" />
            ) : resources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No resources linked to this topic yet
              </p>
            ) : (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-start gap-3 rounded-lg border border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                  >
                    <Link className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{resource.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                        {resource.url && (
                          <span className="truncate">{new URL(resource.url).hostname}</span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}