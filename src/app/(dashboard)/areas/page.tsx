"use client";

import { useMemo, useState } from "react";
import { Archive, Map as MapIcon, Plus } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AreaCard } from "@/components/entities/area-card";
import { AreaDialog } from "@/components/entities/area-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GalleryGrid } from "@/components/views/gallery-grid";
import { EmptyState } from "@/components/views/empty-state";
import { AreasByTypeView } from "@/components/views/areas-by-type-view";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useArchiveArea,
  useAreas,
  useCreateArea,
  useDeleteArea,
  useRestoreArea,
  useUpdateArea,
} from "@/lib/hooks/use-areas";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { Area, CreateAreaInput } from "@/lib/types/domain.types";
import {
  classifyAreaStatus,
  getAreaRollups,
  getSuggestedAreaTypes,
  groupAreasByType,
  normalizeAreaType,
} from "@/lib/utils/areas";

export default function AreasPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | undefined>();
  const [defaultType, setDefaultType] = useState<string | undefined>();
  const [areaPendingDelete, setAreaPendingDelete] = useState<Area | null>(null);

  const { data: areas = [], isLoading } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasks = [] } = useTasks();
  const createArea = useCreateArea(userId);
  const updateArea = useUpdateArea(userId);
  const archiveArea = useArchiveArea(userId);
  const restoreArea = useRestoreArea(userId);
  const deleteArea = useDeleteArea(userId);

  const areasByStatus = useMemo(
    () => ({
      active: areas.filter((area) => classifyAreaStatus(area) === "active"),
      inactive: areas.filter((area) => classifyAreaStatus(area) === "inactive"),
      archived: areas.filter((area) => classifyAreaStatus(area) === "archived"),
    }),
    [areas],
  );

  const groupedAreas = useMemo(() => groupAreasByType(areas), [areas]);
  const suggestedTypes = useMemo(() => getSuggestedAreaTypes(areas), [areas]);
  const rollupsByAreaId = useMemo(() => {
    return new Map(
      areas.map((area) => [
        area.id,
        getAreaRollups({
          areaId: area.id,
          goals,
          projects,
          tasks,
        }),
      ]),
    );
  }, [areas, goals, projects, tasks]);

  const duplicateIndices = useMemo(() => {
    const result = new Map<string, number>();
    const grouped = new Map<string, Area[]>();

    for (const area of areas) {
      if (!grouped.has(area.name)) {
        grouped.set(area.name, []);
      }
      grouped.get(area.name)!.push(area);
    }

    for (const group of grouped.values()) {
      if (group.length < 2) continue;

      const byCreationOrder = [...group].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );

      byCreationOrder.forEach((area, index) => {
        result.set(area.id, index + 1);
      });
    }

    return result;
  }, [areas]);

  const handleOpenCreate = (type?: string) => {
    setDefaultType(type ? normalizeAreaType(type) : undefined);
    setEditingArea(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (area: Area) => {
    setEditingArea(area);
    setDefaultType(undefined);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateAreaInput) => {
    if (editingArea) {
      await updateArea.mutateAsync({
        id: editingArea.id,
        ...data,
      });
    } else {
      await createArea.mutateAsync(data);
    }
    setDialogOpen(false);
    setEditingArea(undefined);
    setDefaultType(undefined);
  };

  const handleRestore = async (area: Area) => {
    await restoreArea.mutateAsync(area.id);
  };

  const handleArchive = async (area: Area) => {
    await archiveArea.mutateAsync(area.id);
  };

  const handleConfirmDelete = async () => {
    if (!areaPendingDelete) {
      return;
    }

    await deleteArea.mutateAsync(areaPendingDelete.id);
    setAreaPendingDelete(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Areas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize your life into focus areas
          </p>
        </div>
        <Button onClick={() => handleOpenCreate()}>
          <Plus className="size-4 mr-2" />
          New Area
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <GalleryGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </GalleryGrid>
          ) : areasByStatus.active.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="No active areas"
              description="Create your first area to start organizing your life"
              actionLabel="Create Area"
              onAction={() => handleOpenCreate()}
              isLoading={createArea.isPending}
            />
          ) : (
            <GalleryGrid>
              {areasByStatus.active.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={handleOpenEdit}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={setAreaPendingDelete}
                  isDeleting={deleteArea.isPending}
                />
              ))}
            </GalleryGrid>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {isLoading ? (
            <GalleryGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </GalleryGrid>
          ) : areasByStatus.inactive.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="No inactive areas"
              description="Areas with no active goals, projects, or open tasks will appear here"
            />
          ) : (
            <GalleryGrid>
              {areasByStatus.inactive.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={handleOpenEdit}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onDelete={setAreaPendingDelete}
                  isDeleting={deleteArea.isPending}
                />
              ))}
            </GalleryGrid>
          )}
        </TabsContent>

        <TabsContent value="by-type">
          <AreasByTypeView
            groupedAreas={groupedAreas}
            rollupsByAreaId={rollupsByAreaId}
            duplicateIndices={duplicateIndices}
            isLoading={isLoading}
            onEdit={handleOpenEdit}
            onArchive={handleArchive}
            isArchiving={archiveArea.isPending}
            onCreateArea={handleOpenCreate}
          />
        </TabsContent>

        <TabsContent value="all">
          {isLoading ? (
            <GalleryGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </GalleryGrid>
          ) : (
            <GalleryGrid>
              {areas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={!area.archive ? handleOpenEdit : undefined}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={setAreaPendingDelete}
                  isDeleting={deleteArea.isPending}
                />
              ))}
            </GalleryGrid>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {isLoading ? (
            <GalleryGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </GalleryGrid>
          ) : areasByStatus.archived.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No archived areas"
              description="Restore or permanently delete areas from here"
            />
          ) : (
            <GalleryGrid>
              {areasByStatus.archived.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={setAreaPendingDelete}
                  isDeleting={deleteArea.isPending}
                />
              ))}
            </GalleryGrid>
          )}
        </TabsContent>
      </Tabs>

      <AreaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        area={editingArea}
        defaultType={defaultType}
        suggestedTypes={suggestedTypes}
        onSubmit={handleSubmit}
        isLoading={createArea.isPending || updateArea.isPending}
      />

      <Dialog open={!!areaPendingDelete} onOpenChange={(open) => !open && setAreaPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Area Permanently?</DialogTitle>
            <DialogDescription>
              {areaPendingDelete
                ? `This will permanently delete "${areaPendingDelete.name}". This cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteArea.isPending}
            >
              Delete Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
