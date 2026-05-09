"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit,
  Target,
  Trash2,
} from "lucide-react";

import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useAreaDetail } from "@/lib/hooks/use-area-detail";
import { useArchiveArea, useRestoreArea, useUpdateArea } from "@/lib/hooks/use-areas";
import {
  useCompleteTaskWithGoalRefresh,
  useDeleteTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { type Task } from "@/lib/types/domain.types";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { normalizeAreaType, classifyAreaStatus, type AreaStatus } from "@/lib/utils/areas";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildReturnTo, encodeReturnTo } from "@/lib/utils/return-to";

const AREA_TYPE_COLORS: Record<string, string> = {
  Business: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Personal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Studies: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const STATUS_LABELS: Record<AreaStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const areaIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [goalTab, setGoalTab] = useState("active");
  const [projectTab, setProjectTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");
  const [noteTab, setNoteTab] = useState("all");
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const projectsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  const { data: areaData, isLoading } = useAreaDetail(areaIdentifier);

  const archiveArea = useArchiveArea(userId);
  const restoreArea = useRestoreArea(userId);
  const updateArea = useUpdateArea(userId);
  const completeTask = useCompleteTaskWithGoalRefresh();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const area = areaData?.area;
  const rollups = areaData?.rollups ?? { goalCount: 0, projectCount: 0, taskCount: 0, noteCount: 0 };

  const areaStatus = area ? classifyAreaStatus(area) : "active";
  const areaType = area ? normalizeAreaType(area.type) : "Personal";

  useEffect(() => {
    if (area) {
      setPageTitle(area.name);
    }
    return () => setPageTitle("");
  }, [area, setPageTitle]);

  const filteredGoals = useMemo(() => {
    const goals = areaData?.goals;
    if (!goals) return [];
    const statusMap: Record<string, string | undefined> = {
      active: "active",
      short: "active",
      mid: "active",
      long: "active",
      inactive: "inactive",
      completed: "completed",
    };
    const termMap: Record<string, string | undefined> = {
      short: "short",
      mid: "mid",
      long: "long",
    };
    const status = statusMap[goalTab];
    const term = termMap[goalTab];
    if (!status) return goals;
    return goals.filter((g) => {
      const normalized = g.is_archived ? "inactive" : g.is_completed ? "completed" : "active";
      if (normalized !== status) return false;
      if (term && g.term !== term) return false;
      return true;
    });
  }, [areaData?.goals, goalTab]);

  const filteredProjects = useMemo(() => {
    const projects = areaData?.projects;
    if (!projects) return [];
    if (projectTab === "all") return projects;
    if (projectTab === "planning") return projects.filter((p) => p.status === "planning");
    if (projectTab === "active") return projects.filter((p) => p.status === "active");
    if (projectTab === "completed") return projects.filter((p) => p.status === "completed");
    if (projectTab === "archived") return projects.filter((p) => p.is_archived);
    return projects;
  }, [areaData?.projects, projectTab]);

  const filteredTasks = useMemo(() => {
    const tasks = areaData?.tasks;
    if (!tasks) return [];
    if (taskTab === "all") return tasks;
    if (taskTab === "inbox") return tasks.filter((t) => t.status === "inbox" && !t.is_completed);
    if (taskTab === "upcoming")
      return tasks.filter((t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed);
    if (taskTab === "overdue")
      return tasks.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      });
    if (taskTab === "by_goal") return tasks.filter((t) => t.linkedGoalIds && t.linkedGoalIds.length > 0);
    if (taskTab === "by_project") return tasks.filter((t) => !!t.project_id);
    if (taskTab === "completed") return tasks.filter((t) => t.is_completed);
    return tasks;
  }, [areaData?.tasks, taskTab]);

  const filteredNotes = useMemo(() => {
    const notes = areaData?.notes;
    if (!notes) return [];
    if (noteTab === "all") return notes;
    if (noteTab === "inbox") return notes.filter((n) => n.status === "inbox");
    if (noteTab === "to_review") return notes.filter((n) => n.status === "to_review");
    if (noteTab === "active") return notes.filter((n) => n.status === "active" && !n.is_archived);
    if (noteTab === "archived") return notes.filter((n) => n.is_archived);
    return notes;
  }, [areaData?.notes, noteTab]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleArchiveToggle = async (checked: boolean) => {
    if (!area || checked === area.archive) return;
    if (checked) {
      await archiveArea.mutateAsync(area.id);
      router.push("/areas");
    } else {
      await restoreArea.mutateAsync(area.id);
    }
  };

  const handleInactiveToggle = async (checked: boolean) => {
    if (!area || checked === area.inactive) return;
    await updateArea.mutateAsync({ id: area.id, inactive: checked });
  };

  const handleDeleteArea = async () => {
    if (!area) return;
    await archiveArea.mutateAsync(area.id);
    router.push("/areas");
  };

  const handleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (completed) {
      await completeTask.mutateAsync(taskId);
    } else {
      await updateTask.mutateAsync({
        id: taskId,
        input: { is_completed: false, completed_at: null },
      });
    }
  };

  const handleTaskNameSave = async (taskId: string, name: string) => {
    await updateTask.mutateAsync({ id: taskId, input: { name } });
  };

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" onClick={() => router.push("/areas")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Areas
        </Button>
        <EmptyState
          icon={Target}
          title="Area not found"
          description="This area may have been deleted or you do not have access to it."
          actionLabel="Return to Areas"
          onAction={() => router.push("/areas")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push("/areas")}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <button className="hover:text-foreground" onClick={() => router.push("/areas")}>
          Areas
        </button>
        <span>/</span>
        <span className="text-foreground">{area.name}</span>
      </div>

      {/* Properties Header */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            {/* Area Icon */}
            {area.icon ? (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: area.color ? `${area.color}20` : "var(--muted)" }}
              >
                {area.icon}
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 font-bold"
                style={{
                  backgroundColor: area.color ? `${area.color}20` : "var(--muted)",
                  color: area.color || "var(--foreground)",
                }}
              >
                {area.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              {/* Title */}
              <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", AREA_TYPE_COLORS[areaType])}>
                  {areaType}
                </Badge>
                {area.inactive && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Inactive
                  </Badge>
                )}
                {area.archive && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>

              {/* Description */}
              {area.description && (
                <p className="text-sm text-muted-foreground">{area.description}</p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="gap-1"
          >
            Properties
            {isPropertiesOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {/* Activity Rollups */}
        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <button
            onClick={() => scrollToSection("goals")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {rollups.goalCount}
            </span>
            <span className="text-muted-foreground">Goals</span>
          </button>
          <button
            onClick={() => scrollToSection("projects")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">
              {rollups.projectCount}
            </span>
            <span className="text-muted-foreground">Projects</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {rollups.taskCount}
            </span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {rollups.noteCount}
            </span>
            <span className="text-muted-foreground">Notes</span>
          </button>
        </div>

        {/* Collapsible Properties Panel */}
        {isPropertiesOpen && (
          <>
            <Separator />
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {/* Type */}
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="mt-1 font-medium">{areaType}</p>
                </div>
                {/* Status */}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1 font-medium">{STATUS_LABELS[areaStatus]}</p>
                </div>
                {/* Icon */}
                <div>
                  <Label className="text-xs text-muted-foreground">Icon</Label>
                  <p className="mt-1 font-medium">{area.icon || "None"}</p>
                </div>
                {/* Color */}
                <div>
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {area.color && (
                      <div
                        className="size-4 rounded-full border"
                        style={{ backgroundColor: area.color }}
                      />
                    )}
                    <span className="font-medium">{area.color || "None"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/areas/${area.slug || area.id}/edit`)}
                  className="gap-1.5"
                >
                  <Edit className="size-3.5" />
                  Edit Area
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="area-inactive"
                    checked={area.inactive}
                    disabled={updateArea.isPending}
                    onCheckedChange={(checked) => handleInactiveToggle(checked === true)}
                  />
                  <Label htmlFor="area-inactive" className="cursor-pointer text-sm">
                    Inactive
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="area-archived"
                    checked={area.archive}
                    disabled={archiveArea.isPending}
                    onCheckedChange={(checked) => handleArchiveToggle(checked === true)}
                  />
                  <Label htmlFor="area-archived" className="cursor-pointer text-sm">
                    Archived
                  </Label>
                </div>
              </div>

              {area.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{area.description}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Linked Goals Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="goals"
          entityType="goals"
          tabs={[
            { value: "active", label: "Active" },
            { value: "short", label: "Short Term" },
            { value: "mid", label: "Mid Term" },
            { value: "long", label: "Long Term" },
            { value: "inactive", label: "Inactive" },
            { value: "completed", label: "Completed" },
          ]}
          activeTab={goalTab}
          onTabChange={setGoalTab}
          isLoading={isLoading}
          emptyTitle="No goals linked to this area"
          emptyDescription="Create a goal to track objectives for this area."
          onCreateNew={() => setIsNewGoalOpen(true)}
          createLabel="New Goal"
        >
          {filteredGoals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGoals.map((goal) => {
                const goalReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area.name}
                    onEdit={() => router.push(`${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(goalReturnTo)}`)}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Projects Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="projects"
          entityType="projects"
          tabs={[
            { value: "all", label: "All", count: rollups.projectCount },
            { value: "planning", label: "Planning" },
            { value: "active", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={projectTab}
          onTabChange={setProjectTab}
          isLoading={isLoading}
          emptyTitle="No projects linked to this area"
          emptyDescription="Create a project to track work in this area."
          onCreateNew={() => setIsNewProjectOpen(true)}
          createLabel="New Project"
        >
          {filteredProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project) => {
                const projectReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    areaName={area.name}
                    returnTo={projectReturnTo}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Tasks Section */}
      <div ref={tasksRef}>
        <GoalDetailSection
          id="tasks"
          entityType="tasks"
          tabs={[
            { value: "all", label: "All", count: rollups.taskCount },
            { value: "inbox", label: "Inbox" },
            { value: "upcoming", label: "Upcoming" },
            { value: "overdue", label: "Overdue" },
            { value: "by_goal", label: "By Goal" },
            { value: "by_project", label: "By Project" },
            { value: "completed", label: "Completed" },
          ]}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          isLoading={isLoading}
          emptyTitle="No tasks linked to this area"
          emptyDescription="Create a task to track work in this area."
          onCreateNew={() => setIsNewTaskOpen(true)}
          createLabel="New Task"
        >
          {filteredTasks.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  areaName={area.name}
                  projectName={null}
                  onCompletionToggle={handleTaskCompletion}
                  onFocusToggle={() => {}}
                  onNameSave={handleTaskNameSave}
                  onDelete={handleTaskDelete}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsTaskEditOpen(true);
                  }}
                />
              ))}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Notes Section */}
      <div ref={notesRef}>
        <GoalDetailSection
          id="notes"
          entityType="notes"
          tabs={[
            { value: "all", label: "All", count: rollups.noteCount },
            { value: "inbox", label: "Inbox" },
            { value: "to_review", label: "To Review" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoading}
          emptyTitle="No notes linked to this area"
          emptyDescription="Create a note to capture thoughts for this area."
          onCreateNew={() => area && router.push(`/notes/new?areaId=${area.id}&returnTo=${encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`))}`)}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNotes.map((note) => {
                const noteReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => router.push(`/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(noteReturnTo)}`)}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">{note.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {note.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {note.type}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Area?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This archives the area. The linked goals, projects, tasks, and notes will become unlinked. You can restore it later from the archive.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteArea}
              disabled={archiveArea.isPending}
            >
              Archive Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Goal Creation */}
      <GoalDialog
        open={isNewGoalOpen}
        onOpenChange={setIsNewGoalOpen}
        defaultAreaIds={area?.id ? [area.id] : []}
        onSuccess={() => setIsNewGoalOpen(false)}
      />

      {/* Inline Project Creation */}
      <ProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        defaultAreaIds={area?.id ? [area.id] : []}
        onSuccess={() => setIsNewProjectOpen(false)}
      />

      {/* Inline Task Creation */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultAreaId={area?.id}
        onSuccess={() => setIsNewTaskOpen(false)}
      />

      {/* Task Edit Dialog */}
      <TaskDialog
        open={isTaskEditOpen}
        onOpenChange={(open) => {
          setIsTaskEditOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onDelete={(id) => {
          handleTaskDelete(id);
          setEditingTask(null);
        }}
      />

      {/* Note creation navigates directly to /notes/new */}
    </div>
  );
}