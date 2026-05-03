"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FilePlus,
  Filter,
  Heart,
  HeartOff,
  NotebookPen,
  Pin,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useCreateNote, useNotes, useNotebooks, useToggleFavoriteNote } from "@/lib/hooks/use-notes";
import { useAuth } from "@/components/providers/auth-provider";
import type { Note } from "@/lib/types/domain.types";
import { NOTE_STATUS, type NoteStatus } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

const STATUS_TABS: { value: NoteStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: NOTE_STATUS.INBOX, label: "Inbox" },
  { value: NOTE_STATUS.TO_REVIEW, label: "To Review" },
  { value: NOTE_STATUS.ACTIVE, label: "Active" },
  { value: NOTE_STATUS.ARCHIVE, label: "Archive" },
];

const STATUS_BADGE_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  note: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  research: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  journal: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

function NoteCard({
  note,
  areaName,
  onOpen,
  onToggleFavorite,
}: {
  note: Note;
  areaName?: string;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const preview = extractTextPreview(note.content);

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {note.pin && <Pin className="size-3 shrink-0 text-muted-foreground" />}
          <h3 className="truncate font-semibold">{note.name}</h3>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          title={note.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          {note.favorite ? (
            <Heart className="size-4 fill-rose-500 text-rose-500" />
          ) : (
            <HeartOff className="size-4" />
          )}
        </button>
      </div>

      {preview && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <Badge variant="secondary" className={cn("text-xs", STATUS_BADGE_COLORS[note.status])}>
          {note.status.replace("_", " ")}
        </Badge>
        <Badge variant="secondary" className={cn("text-xs", TYPE_BADGE_COLORS[note.type])}>
          {note.type}
        </Badge>
        {note.notebook && (
          <Badge variant="outline" className="text-xs">
            <BookOpen className="mr-1 size-2.5" />
            {note.notebook}
          </Badge>
        )}
        {areaName && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {areaName}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function NoteCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

function extractTextPreview(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as { content?: Array<{ content?: Array<{ text?: string }> }> };
    const texts: string[] = [];
    for (const block of parsed.content ?? []) {
      for (const node of block.content ?? []) {
        if (node.text) texts.push(node.text);
      }
      if (texts.join(" ").length > 200) break;
    }
    return texts.join(" ").slice(0, 200);
  } catch {
    return content.slice(0, 200);
  }
}

export default function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeStatus, setActiveStatus] = useState<NoteStatus | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notebookFilter, setNotebookFilter] = useState("");

  const { data: allNotes = [], isLoading } = useNotes({ status: "all" });
  const { data: notebooks = [] } = useNotebooks();
  const { data: areas = [] } = useAreas();
  const createNote = useCreateNote();
  const toggleFavorite = useToggleFavoriteNote();

  const areaNames = useMemo(
    () => new Map(areas.map((a) => [a.id, a.name])),
    [areas],
  );

  const filtered = useMemo(() => {
    let result = allNotes;
    if (activeStatus !== "all") {
      result = result.filter((n) => n.status === activeStatus);
    }
    if (favoritesOnly) {
      result = result.filter((n) => n.favorite);
    }
    if (notebookFilter.trim()) {
      result = result.filter((n) =>
        n.notebook?.toLowerCase().includes(notebookFilter.toLowerCase()),
      );
    }
    return result;
  }, [allNotes, activeStatus, favoritesOnly, notebookFilter]);

  const handleCreate = async () => {
    const note = await createNote.mutateAsync({
      name: "Untitled note",
      status: NOTE_STATUS.INBOX,
    });
    router.push(`/notes/${note.slug ?? note.id}`);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            {allNotes.length} {allNotes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <Button onClick={handleCreate} disabled={createNote.isPending}>
          <FilePlus className="mr-2 size-4" />
          New Note
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoritesOnly((v) => !v)}
          className="h-8 gap-1.5"
        >
          <Heart className={cn("size-3.5", favoritesOnly && "fill-current")} />
          Favorites
        </Button>
        {notebooks.length > 0 && (
          <div className="relative">
            <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={notebookFilter}
              onChange={(e) => setNotebookFilter(e.target.value)}
              placeholder="Filter notebook…"
              className="h-8 w-40 pl-7 text-sm"
            />
          </div>
        )}
      </div>

      <Tabs
        value={activeStatus}
        onValueChange={(v) => setActiveStatus(v as NoteStatus | "all")}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? allNotes.length
                : allNotes.filter((n) => n.status === tab.value).length;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <NoteCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title={
                  favoritesOnly
                    ? "No favorite notes"
                    : tab.value === "all"
                      ? "No notes yet"
                      : `No ${tab.label.toLowerCase()} notes`
                }
                description={
                  tab.value === "all" && !favoritesOnly
                    ? "Create your first note to get started"
                    : "Try a different filter"
                }
                actionLabel={tab.value === "all" && !favoritesOnly ? "New Note" : undefined}
                onAction={tab.value === "all" && !favoritesOnly ? handleCreate : undefined}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    areaName={note.area_id ? areaNames.get(note.area_id) : undefined}
                    onOpen={() => router.push(`/notes/${note.slug ?? note.id}`)}
                    onToggleFavorite={() =>
                      toggleFavorite.mutate({ id: note.id, favorite: !note.favorite })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
