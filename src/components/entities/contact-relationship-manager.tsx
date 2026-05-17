"use client";

import { useEffect, useState } from "react";
import { X, Link2 } from "lucide-react";

import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useContactRelationshipOptions } from "@/lib/hooks/use-contact-relationship-options";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContactRelationshipManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  /** Current persisted link ids from the contact. */
  initialAreaIds: string[];
  initialGoalIds: string[];
  initialProjectIds: string[];
  initialTaskIds: string[];
  /** Called with the final id sets when the user saves. */
  onSave: (links: {
    area_ids: string[];
    goal_ids: string[];
    project_ids: string[];
    task_ids: string[];
  }) => void;
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactRelationshipManager({
  open,
  onOpenChange,
  contactName,
  initialAreaIds,
  initialGoalIds,
  initialProjectIds,
  initialTaskIds,
  onSave,
  isSaving,
}: ContactRelationshipManagerProps) {
  // Local staging state — initialised from persisted ids when the dialog opens
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // Reset staging state every time the dialog opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setAreaIds(initialAreaIds);
      setGoalIds(initialGoalIds);
      setProjectIds(initialProjectIds);
      setTaskIds(initialTaskIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Entity lists
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();

  // Shared relationship rule engine
  const {
    visibleAreas,
    filteredGoals,
    filteredProjects,
    filteredTasks,
    isRelationsLoading,
    cleanSelections,
  } = useContactRelationshipOptions({
    allAreas,
    allGoals,
    allProjects,
    allTasks,
    selectedAreaIds: areaIds,
    selectedGoalIds: goalIds,
    selectedProjectIds: projectIds,
    selectedTaskIds: taskIds,
    enabled: open,
  });

  const activeAreas = allAreas.filter((a) => !a.archive);
  const activeGoals = allGoals.filter((g) => !g.is_archived);
  const activeProjects = allProjects.filter((p) => !p.is_archived);

  // Auto-clean invalid staged selections when filters change
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isRelationsLoading) return;
    const cleaned = cleanSelections();
    if (!cleaned.changed) return;
    setAreaIds(cleaned.areaIds);
    setGoalIds(cleaned.goalIds);
    setProjectIds(cleaned.projectIds);
    setTaskIds(cleaned.taskIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAreas, filteredGoals, filteredProjects, filteredTasks, isRelationsLoading]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Toggle helpers
  const toggleArea = (id: string) =>
    setAreaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleGoal = (id: string) =>
    setGoalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleProject = (id: string) =>
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleTask = (id: string) =>
    setTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = () => {
    onSave({
      area_ids: areaIds,
      goal_ids: goalIds,
      project_ids: projectIds,
      task_ids: taskIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" />
            Manage Relationships
          </DialogTitle>
          <DialogDescription>
            Configure linked areas, goals, projects, and tasks for {contactName}. Selections are
            filtered to respect entity relationships.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Areas */}
          <EntitySelector
            label="Areas"
            selectedIds={areaIds}
            options={visibleAreas}
            activeEntities={activeAreas}
            onToggle={toggleArea}
            onClear={() => setAreaIds([])}
            emptyMessage="No areas match the current selection."
            getDisplay={(a) => ({ name: a.name, icon: a.icon ?? undefined })}
          />

          <Separator />

          {/* Goals */}
          <EntitySelector
            label="Goals"
            selectedIds={goalIds}
            options={filteredGoals}
            activeEntities={activeGoals}
            onToggle={toggleGoal}
            onClear={() => setGoalIds([])}
            emptyMessage={
              areaIds.length > 0 || projectIds.length > 0 || taskIds.length > 0
                ? "No goals match the current selection."
                : "No goals available."
            }
            getDisplay={(g) => ({ name: g.name })}
          />

          <Separator />

          {/* Projects */}
          <EntitySelector
            label="Projects"
            selectedIds={projectIds}
            options={filteredProjects}
            activeEntities={activeProjects}
            onToggle={toggleProject}
            onClear={() => setProjectIds([])}
            emptyMessage={
              areaIds.length > 0 || goalIds.length > 0 || taskIds.length > 0
                ? "No projects match the current selection."
                : "No projects available."
            }
            getDisplay={(p) => ({ name: p.name })}
          />

          <Separator />

          {/* Tasks */}
          <EntitySelector
            label="Tasks"
            selectedIds={taskIds}
            options={filteredTasks}
            activeEntities={allTasks}
            onToggle={toggleTask}
            onClear={() => setTaskIds([])}
            emptyMessage={
              areaIds.length > 0 || goalIds.length > 0 || projectIds.length > 0
                ? "Tasks are limited by selected goals, projects, or areas."
                : "No tasks available."
            }
            getDisplay={(t) => ({ name: t.name })}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Relationships"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Internal helper: a single entity multi-select row
// ---------------------------------------------------------------------------

interface EntitySelectorProps<T extends { id: string }> {
  label: string;
  selectedIds: string[];
  options: T[];
  activeEntities: T[];
  onToggle: (id: string) => void;
  onClear: () => void;
  emptyMessage: string;
  getDisplay: (entity: T) => { name: string; icon?: string };
}

function EntitySelector<T extends { id: string }>({
  label,
  selectedIds,
  options,
  activeEntities,
  onToggle,
  onClear,
  emptyMessage,
  getDisplay,
}: EntitySelectorProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            {selectedIds.length === 0 ? `Select ${label.toLowerCase()}…` : `${selectedIds.length} selected`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={onClear}>Clear selection</DropdownMenuItem>
            <ScrollArea className="max-h-56">
              {options.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
              ) : (
                options.map((entity) => {
                  const { name, icon } = getDisplay(entity);
                  return (
                    <DropdownMenuItem
                      key={entity.id}
                      onClick={() => onToggle(entity.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={selectedIds.includes(entity.id)} />
                      {icon ? `${icon} ` : ""}
                      {name}
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds
            .map((id) => activeEntities.find((e) => e.id === id))
            .filter(Boolean)
            .map((entity) => {
              const { name, icon } = getDisplay(entity!);
              return (
                <Badge key={entity!.id} variant="secondary" className="flex items-center gap-1">
                  {icon ? `${icon} ` : ""}
                  {name}
                  <button
                    type="button"
                    onClick={() => onToggle(entity!.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              );
            })}
        </div>
      )}
    </div>
  );
}
