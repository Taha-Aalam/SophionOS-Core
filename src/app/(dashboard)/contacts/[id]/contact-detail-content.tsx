"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Edit,
  Link2,
  Mail,
  Phone,
  RotateCcw,
  Star,
  User2,
} from "lucide-react";

import { ContactDialog } from "@/components/entities/contact-dialog";
import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import { ContactDetailRelationshipSections } from "@/components/entities/contact-detail-relationship-sections";
import { ContactRelationshipManager } from "@/components/entities/contact-relationship-manager";
import { TaskDialog } from "@/components/entities/task-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useContactBySlug,
  useContactAreaLinks,
  useContactGoalLinks,
  useContactLogs,
  useContactProjectLinks,
  useContactTaskLinks,
  useCreateContactLog,
  useDeleteContact,
  useToggleContactFavorite,
  useUpdateContact,
  useArchiveContact,
  useUnlinkContactFromArea,
  useUnlinkContactFromGoal,
  useUnlinkContactFromProject,
  useUnlinkContactFromTask,
} from "@/lib/hooks/use-contacts";
import { useAreas } from "@/lib/hooks/use-areas";
import { useNotes } from "@/lib/hooks/use-notes";
import { useResources } from "@/lib/hooks/use-resources";
import { useGoals, useRestoreGoal, useArchiveGoal } from "@/lib/hooks/use-goals";
import { useProjects, useArchiveProject, useRestoreProject } from "@/lib/hooks/use-projects";
import {
  useTasks,
  useArchivedTasks,
  useArchiveTask,
  useCompleteTask,
  useDeleteTask,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useUpdateTask,
  useUncompleteTask,
} from "@/lib/hooks/use-tasks";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
import type { Task } from "@/lib/types/domain.types";
import { contactService } from "@/lib/services/contact.service";
import { useUIStore } from "@/lib/stores/ui.store";
import { mergeProjectQueryResults } from "@/lib/utils/projects";
import { resolveLinkedProjectsAcrossStatuses } from "@/lib/utils/contact-detail-relations";
import { buildReturnToChain, popReturnToHref } from "@/lib/utils/return-to";
import {
  type ContactFormValues,
  buildContactCreateInput,
} from "@/lib/utils/contact-input";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RelationshipSummary({
  label,
  links,
  entities,
  routePrefix,
  router,
}: {
  label: string;
  links: Array<{ area_id?: string; goal_id?: string; project_id?: string; task_id?: string }>;
  entities: Array<{ id: string; name: string }>;
  routePrefix: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  if (links.length === 0) return null;
  const idKey = label === "Areas" ? "area_id" : label === "Goals" ? "goal_id" : label === "Projects" ? "project_id" : "task_id";
  const firstId = links[0]?.[idKey as keyof typeof links[0]];
  const firstName = entities.find((e) => e.id === firstId)?.name ?? "Unknown";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      {routePrefix ? (
        <button
          className="text-sm font-medium hover:underline"
          onClick={() => router.push(`${routePrefix}/${firstId}`)}
        >
          {firstName}
        </button>
      ) : (
        <span className="text-sm font-medium">{firstName}</span>
      )}
      {links.length > 1 && (
        <span className="text-xs text-muted-foreground">+{links.length - 1}</span>
      )}
    </div>
  );
}



export function ContactDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const contactSlug = params.id as string;
  const backHref = popReturnToHref(searchParams, "/contacts");
  const returnToChain = buildReturnToChain(searchParams);
  useEscapeBack(backHref);

  const { setPageTitle } = useUIStore();
  const { data: contact, isLoading, error } = useContactBySlug(contactSlug);

  useEffect(() => {
    if (contact?.name) setPageTitle(contact.name);
    return () => setPageTitle("");
  }, [contact?.name, setPageTitle]);

  const { data: logs = [] } = useContactLogs(contact?.id ?? "");
  const { data: projectLinks = [] } = useContactProjectLinks(contact?.id ?? "");
  const { data: taskLinks = [] } = useContactTaskLinks(contact?.id ?? "");
  const { data: areaLinks = [] } = useContactAreaLinks(contact?.id ?? "");
  const { data: goalLinks = [] } = useContactGoalLinks(contact?.id ?? "");

  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact(contactSlug);
  const toggleFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();
  const restoreGoal = useRestoreGoal();
  const archiveGoal = useArchiveGoal();
  const createLog = useCreateContactLog(contact?.id ?? "", contactSlug);
  const unlinkProject = useUnlinkContactFromProject();
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const unlinkTask = useUnlinkContactFromTask();
  const unlinkArea = useUnlinkContactFromArea();
  const unlinkGoal = useUnlinkContactFromGoal();

  const { data: activeProjects = [] } = useProjects({});
  const { data: archivedProjects = [] } = useProjects({ status: "archived" });
  const { data: allTasks = [] } = useTasks({});
  const { data: allArchivedTasks = [] } = useArchivedTasks();
  const { data: allAreas = [] } = useAreas({});
  const { data: allNotes = [] } = useNotes({ status: "all" });
  const { data: allResources = [] } = useResources({ status: "all" });
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const allProjects = useMemo(
    () => mergeProjectQueryResults(activeProjects, archivedProjects),
    [activeProjects, archivedProjects],
  );

  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDeleteTask = usePermanentDeleteTask();
  const deleteTask = useDeleteTask();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRelationshipManagerOpen, setIsRelationshipManagerOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "logs">("details");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [areaTab, setAreaTab] = useState("active");
  const [goalTab, setGoalTab] = useState("active");
  const [projectTab, setProjectTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");

  const linkedAreas = useMemo(() => {
    const ids = new Set(areaLinks.map((l) => l.area_id));
    return allAreas.filter((a) => ids.has(a.id));
  }, [areaLinks, allAreas]);

  const linkedGoals = useMemo(() => {
    const ids = new Set(goalLinks.map((l) => l.goal_id));
    return allGoals.filter((g) => ids.has(g.id));
  }, [goalLinks, allGoals]);

  const linkedProjects = useMemo(
    () =>
      resolveLinkedProjectsAcrossStatuses(
        projectLinks,
        activeProjects,
        archivedProjects,
      ),
    [projectLinks, activeProjects, archivedProjects],
  );

  const linkedTasks = useMemo(() => {
    const ids = new Set(taskLinks.map((l) => l.task_id));
    return [
      ...allTasks.filter((t) => ids.has(t.id)),
      ...allArchivedTasks.filter((t) => ids.has(t.id)),
    ];
  }, [taskLinks, allTasks, allArchivedTasks]);

  const contactReturnTo = `/contacts/${contactSlug}`;

  const handleTaskCompletion = useCallback(
    async (taskId: string, isCompleted: boolean) => {
      if (isCompleted) {
        await completeTask.mutateAsync(taskId);
      } else {
        await uncompleteTask.mutateAsync(taskId);
      }
    },
    [completeTask, uncompleteTask],
  );

  const handleTaskFocus = useCallback(
    async (taskId: string, isFocused: boolean) => {
      await focusTask.mutateAsync({ id: taskId, is_focused: isFocused });
    },
    [focusTask],
  );

  const handleTaskNameSave = useCallback(
    async (taskId: string, name: string) => {
      await updateTask.mutateAsync({ id: taskId, input: { name } });
    },
    [updateTask],
  );

  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      await deleteTask.mutateAsync(taskId);
    },
    [deleteTask],
  );

  const handleTaskEdit = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleTaskArchiveToggle = useCallback(
    async (task: Task) => {
      if (task.is_archived) {
        await restoreTask.mutateAsync(task.id);
      } else {
        await archiveTask.mutateAsync(task.id);
      }
    },
    [archiveTask, restoreTask],
  );

  const handlePermanentDelete = useCallback(
    (id: string) => {
      permanentDeleteTask.mutate(id);
    },
    [permanentDeleteTask],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <EmptyState
          icon={User2}
          title="Contact not found"
          description="This contact may have been deleted or the link is incorrect."
          actionLabel="Back to Contacts"
          onAction={() => router.push(backHref)}
        />
      </div>
    );
  }

  const handleEdit = () => setIsEditOpen(true);

  const handleEditSubmit = (values: ContactFormValues) => {
    updateContact.mutate(
      { id: contact.id, input: buildContactCreateInput(values) },
      { onSuccess: () => setIsEditOpen(false) },
    );
  };

  const handleDelete = () => {
    deleteContact.mutate(contact.id, {
      onSuccess: () => router.push("/contacts"),
    });
  };

  const handleToggleFavorite = () => {
    toggleFavorite.mutate(contact.id);
  };

  const handleArchive = () => {
    archiveContact.mutate(
      { id: contact.id, archive: !contact.archive },
      {
        onSuccess: () => {
          router.push("/contacts");
        },
      },
    );
  };

  const handleLogInteraction = () => {
    if (!logNote.trim()) return;
    createLog.mutate(
      { message: logNote.trim() },
      { onSuccess: () => setLogNote("") },
    );
  };

  const handleRelationshipSave = (links: {
    area_ids: string[];
    goal_ids: string[];
    project_ids: string[];
    task_ids: string[];
  }) => {
    updateContact.mutate(
      { id: contact.id, input: links },
      { onSuccess: () => setIsRelationshipManagerOpen(false) },
    );
  };

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
          <span>Contacts</span>
          <span>/</span>
          <span className="text-foreground">{contact.name}</span>
        </div>

        {/* Main card */}
        <div className="rounded-xl border bg-card">
          {/* Header with avatar, name, role, and actions */}
          <div className="flex items-start gap-4 p-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0 ring-2 ring-border overflow-hidden relative">
              {contact.image_url ? (
                <Image src={contact.image_url} alt={contact.name} fill className="object-cover" unoptimized />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name and role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight truncate">{contact.name}</h1>
                {contact.group && (
                  <Badge variant="secondary">{contact.group}</Badge>
                )}
              </div>
              {(contact.role || contact.organization) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[contact.role, contact.organization].filter(Boolean).join(" · ")}
                </p>
              )}

              {/* Contact info row */}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="size-3.5" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="size-3.5" />
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                title={contact.favorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className={`size-4 ${contact.favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleEdit} title="Edit contact">
                <Edit className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleArchive} title={contact.archive ? "Unarchive" : "Archive"}>
                {contact.archive ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
              </Button>
              <DeleteEntityPopover
                variant="detail"
                entityLabel="contact"
                entityName={contact.name}
                requireTypedConfirmation={false}
                disabled={deleteContact.isPending}
                onConfirm={() => handleDelete()}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 border-t px-6 py-3">
            <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Last log</p>
              <p className="text-xs font-medium">
                {contact.last_interaction_at
                  ? (() => {
                      const days = contactService.computeDaysSinceInteraction(contact.last_interaction_at);
                      return days === 0 ? "Today" : `${days}d ago`;
                    })()
                  : "Never"}
              </p>
            </div>
            <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Follow-up</p>
              {(() => {
                const daysUntil = contactService.computeDaysUntilFollowUp(
                  contact.last_interaction_at,
                  contact.follow_up_interval_days,
                );
                if (daysUntil === null) {
                  return <p className="text-xs font-medium text-muted-foreground">—</p>;
                }
                if (daysUntil >= 0) {
                  return <p className="text-xs font-medium">{daysUntil}d left</p>;
                }
                return <p className="text-xs font-medium text-destructive">{Math.abs(daysUntil)}d overdue</p>;
              })()}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t">
            {(["details", "logs"] as const).map((tab) => (
              <button
                key={tab}
                className={`flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "details" ? "Details" : "Log"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Properties section — always open */}
            <div className="rounded-xl border bg-card">
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold">Properties</h2>
              </div>
              <div className="border-t px-6 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {contact.phone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium mt-0.5">{contact.phone}</p>
                    </div>
                  )}
                  {contact.email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium mt-0.5">{contact.email}</p>
                    </div>
                  )}
                  {contact.organization && (
                    <div>
                      <p className="text-muted-foreground">Organization</p>
                      <p className="font-medium mt-0.5">{contact.organization}</p>
                    </div>
                  )}
                  {contact.group && (
                    <div>
                      <p className="text-muted-foreground">Group</p>
                      <p className="font-medium mt-0.5">{contact.group}</p>
                    </div>
                  )}
                  {contact.follow_up_interval_days && (
                    <div>
                      <p className="text-muted-foreground">Follow-up interval</p>
                      <p className="font-medium mt-0.5">{contact.follow_up_interval_days} days</p>
                    </div>
                  )}
                  {contact.linkedin && (
                    <div>
                      <p className="text-muted-foreground">LinkedIn</p>
                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium mt-0.5 hover:underline break-all">
                        {contact.linkedin}
                      </a>
                    </div>
                  )}
                  {contact.website && (
                    <div>
                      <p className="text-muted-foreground">Website</p>
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="font-medium mt-0.5 hover:underline break-all">
                        {contact.website}
                      </a>
                    </div>
                  )}
                </div>
                {contact.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Relationship summary */}
            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-sm font-semibold">Relationships</h2>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsRelationshipManagerOpen(true)}>
                  <Link2 className="size-3.5" />
                  Manage
                </Button>
              </div>
              <Separator />
              <div className="px-6 py-3">
                <div className="flex gap-4 text-sm">
                  <RelationshipSummary label="Areas" links={areaLinks} entities={allAreas} routePrefix="/areas" router={router} />
                  <RelationshipSummary label="Goals" links={goalLinks} entities={allGoals} routePrefix="/goals" router={router} />
                  <RelationshipSummary label="Projects" links={projectLinks} entities={allProjects} routePrefix="/projects" router={router} />
                  <RelationshipSummary label="Tasks" links={taskLinks} entities={allTasks} routePrefix={null} router={router} />
                </div>
              </div>
            </div>

            {/* Relationship sections (shared layout with project/goal detail pages) */}
            <ContactDetailRelationshipSections
              linkedAreas={linkedAreas}
              linkedGoals={linkedGoals}
              linkedProjects={linkedProjects}
              linkedTasks={linkedTasks}
              linkedNotes={allNotes}
              allResources={allResources}
              allAreas={allAreas}
              allGoals={allGoals}
              allProjects={allProjects}
              allTasks={allTasks}
              onUnlinkArea={(areaId) => unlinkArea.mutate({ contactId: contact.id, areaId })}
              onUnlinkGoal={(goalId) => unlinkGoal.mutate({ contactId: contact.id, goalId })}
              onUnlinkProject={(projectId) => unlinkProject.mutate({ contactId: contact.id, projectId })}
              onArchiveProject={(project) => archiveProject.mutate(project.id)}
              onRestoreProject={(project) => restoreProject.mutate(project.id)}
              onUnlinkTask={(taskId) => unlinkTask.mutate({ contactId: contact.id, taskId })}
              onTaskCompletionToggle={handleTaskCompletion}
              onTaskFocusToggle={handleTaskFocus}
              onTaskNameSave={handleTaskNameSave}
              onTaskEdit={handleTaskEdit}
              onTaskArchiveToggle={handleTaskArchiveToggle}
              onTaskPermanentDelete={handlePermanentDelete}
              onRestoreGoal={(goal) => restoreGoal.mutate(goal.id)}
              onArchiveGoal={(goal) => archiveGoal.mutate(goal.id)}
              returnTo={contactReturnTo}
              returnToChain={returnToChain}
              areaTab={areaTab}
              onAreaTabChange={setAreaTab}
              goalTab={goalTab}
              onGoalTabChange={setGoalTab}
              projectTab={projectTab}
              onProjectTabChange={setProjectTab}
              taskTab={taskTab}
              onTaskTabChange={setTaskTab}
            />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* Log interaction input */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-sm font-semibold mb-3">Log Interaction</h2>
              <div className="flex gap-2">
                <Textarea
                  placeholder="What was discussed?"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleLogInteraction} disabled={!logNote.trim()} className="self-end">
                  Log
                </Button>
              </div>
            </div>

            {/* Interaction log */}
            <div className="rounded-xl border bg-card">
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold">History</h2>
              </div>
              <Separator />
              <div className="px-6 py-4">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-md border px-3 py-2">
                        <p className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</p>
                        {log.message && <p className="text-sm mt-1">{log.message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Edit dialog */}
      <ContactDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        contact={contact}
        onSubmit={handleEditSubmit}
      />

      {/* Relationship manager */}
      <ContactRelationshipManager
        open={isRelationshipManagerOpen}
        onOpenChange={setIsRelationshipManagerOpen}
        contactName={contact.name}
        initialAreaIds={areaLinks.map((l) => l.area_id)}
        initialGoalIds={goalLinks.map((l) => l.goal_id)}
        initialProjectIds={projectLinks.map((l) => l.project_id)}
        initialTaskIds={taskLinks.map((l) => l.task_id)}
        onSave={handleRelationshipSave}
        isSaving={updateContact.isPending}
      />

      {/* Task edit dialog (replaces broken /tasks/<id> navigation) */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask ?? undefined}
        onArchiveToggle={(task) => {
          handleTaskArchiveToggle(task);
          setEditingTask(null);
        }}
        onPermanentDelete={(id) => {
          handlePermanentDelete(id);
          setEditingTask(null);
        }}
        onDelete={handleTaskDelete}
      />
    </div>
  );
}
