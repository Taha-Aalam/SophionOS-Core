"use client";

import { useMemo, useState } from "react";
import { Activity, Archive, LayoutGrid, Map as MapIcon, PauseCircle, Plus, Tags } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AreaCard } from "@/components/entities/area-card";
import { AreaDialog } from "@/components/entities/area-dialog";
import { Button } from "@/components/ui/button";
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
import { useNotes } from "@/lib/hooks/use-notes";
import { useResources } from "@/lib/hooks/use-resources";
import { Area, CreateAreaInput } from "@/lib/types/domain.types";
import {
  classifyAreaStatus,
  getAreaRollups,
  getSuggestedAreaTypes,
  groupAreasByType,
  isAreaEffectivelyInactive,
  normalizeAreaType,
  sortAreasForDisplay,
} from "@/lib/utils/areas";

export function AreasContent() {
  const { user } = useAuth();
  const userId = user?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | undefined>();
  const [defaultType, setDefaultType] = useState<string | undefined>();
  const { data: areas = [], isLoading } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes({ includeArchived: true });
  const { data: resources = [] } = useResources();
  const createArea = useCreateArea(userId);
  const updateArea = useUpdateArea(userId);
  const archiveArea = useArchiveArea(userId);
  const restoreArea = useRestoreArea(userId);
  const deleteArea = useDeleteArea(userId);

  const rollupsByAreaId = useMemo(() => {
    return new Map(
      areas.map((area) => [
        area.id,
        getAreaRollups({
          areaId: area.id,
          goals,
          projects,
          tasks,
          notes,
          resources,
        }),
      ]),
    );
  }, [areas, goals, projects, tasks, notes, resources]);

  const sortedAreas = useMemo(() => sortAreasForDisplay(areas), [areas]);

  const areasByStatus = useMemo(
    () => ({
      active: sortAreasForDisplay(areas.filter(
        (area) =>
          classifyAreaStatus(area) === "active" &&
          !isAreaEffectivelyInactive(area, rollupsByAreaId.get(area.id)),
      )),
      inactive: sortAreasForDisplay(areas.filter((area) =>
        isAreaEffectivelyInactive(area, rollupsByAreaId.get(area.id)),
      )),
      archived: sortAreasForDisplay(areas.filter((area) => classifyAreaStatus(area) === "archived")),
    }),
    [areas, rollupsByAreaId],
  );

  const groupedAreas = useMemo(() => groupAreasByType(areas), [areas]);
  const suggestedTypes = useMemo(() => getSuggestedAreaTypes(areas), [areas]);

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

  const handleDelete = async (area: Area) => {
    await deleteArea.mutateAsync(area.id);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">🗺️</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Areas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Organize your life into focus areas
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenCreate()}>
          <Plus className="size-4 mr-2" />
          New Area
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto bg-muted/50 p-1">
          <TabsTrigger value="active">
            <Activity className="mr-1.5 size-3.5" />
            Active
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <PauseCircle className="mr-1.5 size-3.5" />
            Inactive
          </TabsTrigger>
          <TabsTrigger value="by-type">
            <Tags className="mr-1.5 size-3.5" />
            By Type
          </TabsTrigger>
          <TabsTrigger value="all">
            <LayoutGrid className="mr-1.5 size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-1.5 size-3.5" />
            Archived
          </TabsTrigger>
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
                  notesCount={rollupsByAreaId.get(area.id)?.notesCount}
                  resourcesCount={rollupsByAreaId.get(area.id)?.resourcesCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={handleOpenEdit}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={handleDelete}
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
              description="Areas with no active goals, projects, tasks, notes, or resources will appear here"
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
                  notesCount={rollupsByAreaId.get(area.id)?.notesCount}
                  resourcesCount={rollupsByAreaId.get(area.id)?.resourcesCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={handleOpenEdit}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onDelete={handleDelete}
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
              {sortedAreas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  notesCount={rollupsByAreaId.get(area.id)?.notesCount}
                  resourcesCount={rollupsByAreaId.get(area.id)?.resourcesCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onEdit={!area.archive ? handleOpenEdit : undefined}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={handleDelete}
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
                  notesCount={rollupsByAreaId.get(area.id)?.notesCount}
                  resourcesCount={rollupsByAreaId.get(area.id)?.resourcesCount}
                  duplicateIndex={duplicateIndices.get(area.id)}
                  onArchive={handleArchive}
                  isArchiving={archiveArea.isPending}
                  onRestore={handleRestore}
                  isRestoring={restoreArea.isPending}
                  onDelete={handleDelete}
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
    </div>
  );
}
