"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAreas } from "@/lib/hooks/use-areas";
import { useNotes } from "@/lib/hooks/use-notes";
import { useResources } from "@/lib/hooks/use-resources";
import { useCreateTopic, useUpdateTopic } from "@/lib/hooks/use-topics";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { cn } from "@/lib/utils";

interface TopicForm {
  name: string;
  area_ids: string[];
  note_ids: string[];
  resource_ids: string[];
  favorite: boolean;
}

const defaultForm: TopicForm = {
  name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false,
};

export interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: TopicWithCounts;
  defaultAreaId?: string;
  onSuccess?: () => void;
}

export function TopicDialog({ open, onOpenChange, topic, defaultAreaId, onSuccess }: TopicDialogProps) {
  const [form, setForm] = useState<TopicForm>(defaultForm);
  const { data: areas = [] } = useAreas();
  const { data: allNotes = [] } = useNotes({ includeArchived: false });
  const { data: allResources = [] } = useResources({});
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();

  useEffect(() => {
    if (!open) return;
    if (topic) {
      // Sync local form to incoming entity when the dialog is opened in edit
      // mode. setState-in-effect is intentional here: we don't control how
      // often the parent re-renders, and we want the form to mirror `topic`
      // on each open transition (the common dialog mount/unmount pattern).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: topic.name,
        area_ids: topic.linkedAreaIds ?? [],
        note_ids: [], resource_ids: [], favorite: topic.favorite,
      });
    } else {
      setForm({ ...defaultForm, area_ids: defaultAreaId ? [defaultAreaId] : [] });
    }
  }, [open, topic, defaultAreaId]);

  const availableNotes = useMemo(() => {
    if (form.resource_ids.length > 0) {
      const selectedResources = form.resource_ids
        .map((id) => allResources.find((r) => r.id === id))
        .filter(Boolean) as typeof allResources;
      const allowedAreaIds = new Set(selectedResources.map((r) => r.area_id).filter(Boolean) as string[]);
      const allowedProjectIds = new Set(
        selectedResources.flatMap((r) => r.linkedProjectIds ?? []),
      );
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
      return allResources.filter(
        (r) =>
          (r.area_id && allowedAreaIds.has(r.area_id)) ||
          (r.linkedProjectIds?.some((pid) => allowedProjectIds.has(pid)) ?? false),
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

  const handleClose = () => {
    setForm(defaultForm);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (topic) {
      await updateTopic.mutateAsync({
        id: topic.id,
        input: {
          name: form.name, area_ids: form.area_ids,
          note_ids: form.note_ids, resource_ids: form.resource_ids,
          favorite: form.favorite,
        },
      });
    } else {
      await createTopic.mutateAsync({
        name: form.name, area_ids: form.area_ids,
        note_ids: form.note_ids, resource_ids: form.resource_ids,
        favorite: form.favorite,
      });
    }
    setForm(defaultForm);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topic ? "Edit Topic" : "New Topic"}</DialogTitle>
          <DialogDescription>
            {topic ? "Update topic details" : "Create a topic to organize notes and resources"}
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
                  <div className="max-h-56 overflow-y-auto overscroll-contain">
                    {filteredAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-2 py-1.5">
                        {form.note_ids.length > 0 || form.resource_ids.length > 0
                          ? "No areas match selected items"
                          : "No areas available"}
                      </p>
                    ) : (
                      filteredAreas.map((area) => {
                        const isSelected = form.area_ids.includes(area.id);
                        const icon = (area.icon as string | null | undefined) ?? null;
                        return (
                          <DropdownMenuItem
                            key={area.id}
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => handleAreaToggle(area.id)}
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
                  <div className="max-h-56 overflow-y-auto overscroll-contain">
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
                  </div>
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
                  <div className="max-h-56 overflow-y-auto overscroll-contain">
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
                  </div>
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
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || createTopic.isPending || updateTopic.isPending}>
            {topic ? "Save Changes" : "Create Topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
