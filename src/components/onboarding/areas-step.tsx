"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAreas, useCreateArea } from "@/lib/hooks/use-areas";
import { useAuth } from "@/components/providers/auth-provider";
import { Plus, X } from "lucide-react";

export interface AreasStepValue {
  /** IDs of newly-created areas (tracked so the orchestrator can link them). */
  createdAreaIds: string[];
}

export function AreasStep({
  onAreasCreated,
}: {
  onAreasCreated?: (ids: string[]) => void;
}) {
  const { user } = useAuth();
  const { data: areas, isLoading } = useAreas();
  const createArea = useCreateArea(user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const result = await createArea.mutateAsync({
      name: newName.trim(),
      icon: newIcon.trim() || null,
    });
    const id = result?.id;
    if (id) {
      const next = [...createdIds, id];
      setCreatedIds(next);
      onAreasCreated?.(next);
    }
    setNewName("");
    setNewIcon("");
    setShowCreate(false);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col items-center gap-1 p-4">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-4 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {areas?.map((area) => (
          <Card
            key={area.id}
            className={cn(
              "flex flex-col items-center gap-1 p-4 text-center",
              "border-border/60",
            )}
          >
            <span className="text-2xl">{area.icon}</span>
            <span className="text-sm font-medium">{area.name}</span>
          </Card>
        ))}
        {(!areas || areas.length === 0) && (
          <p className="text-sm text-muted-foreground py-4 text-center col-span-full">No areas yet. Create one above to get started.</p>
        )}
      </div>

      {!showCreate ? (
        <Button
          variant="outline"
          size="sm"
          className="mx-auto flex gap-1.5"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-4" />
          Create new area
        </Button>
      ) : (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">New area</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setNewIcon("");
              }}
              aria-label="Remove area"
            >
              <X className="size-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="w-16 space-y-1.5">
              <Label htmlFor="onboarding-area-icon" className="sr-only">
                Icon
              </Label>
              <Input
                id="onboarding-area-icon"
                placeholder="🏋️"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="text-center text-lg"
                maxLength={2}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="onboarding-area-name" className="sr-only">
                Area name
              </Label>
              <Input
                id="onboarding-area-name"
                placeholder="e.g. Fitness"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!newName.trim() || createArea.isPending}
            onClick={handleCreate}
          >
            {createArea.isPending ? "Creating…" : "Add area"}
          </Button>
          {createArea.isError && (
            <p className="text-sm text-destructive">Failed to create area. Please try again.</p>
          )}
        </Card>
      )}
    </div>
  );
}
