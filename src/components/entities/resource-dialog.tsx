"use client";

import { useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

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
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import { createClient } from "@/lib/supabase/client";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "@/lib/types/domain.types";
import { RESOURCE_STATUS, RESOURCE_TYPE, type ResourceStatus } from "@/lib/utils/constants";
import { deriveResourceStatus } from "@/lib/utils/status-routing";
import {
  computeVisibleAreas,
  computeFilteredProjects,
  computeFilteredGoals,
  computeFilteredTasks,
} from "@/lib/utils/resource-dialog-filters";
import { useGoalProjectRelations } from "@/lib/hooks/use-goal-project-ids-map";

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
  { value: RESOURCE_STATUS.COMPLETED, label: "Completed" },
];

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource | null;
  onSubmit: (input: CreateResourceInput | UpdateResourceInput) => void;
  isPending?: boolean;
  initialGoalIds?: string[];
  initialAreaIds?: string[];
  initialProjectId?: string;
  initialTopicId?: string;
}

export function ResourceDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
  isPending,
  initialGoalIds,
  initialAreaIds,
  initialProjectId,
  initialTopicId,
}: ResourceDialogProps) {
  const isEdit = !!resource;
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: topics = [] } = useTopics();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: tasks = [] } = useTasks();

  // Fetch relation tables for cross-filtering
  const { goalProjectIdsMap, projectGoalIdsMap, isLoading: isLoadingGoalProjectRelations } =
    useGoalProjectRelations({ enabled: open });

  const { data: goalTaskRelations = [], isLoading: isLoadingGoalTaskRelations } = useQuery({
    queryKey: ["goal-task-relations"],
    queryFn: async () => {
      const { data } = await createClient().from("goal_tasks").select("goal_id, task_id");
      return data ?? [];
    },
    enabled: open,
  });

  const isRelationsLoading = isLoadingGoalProjectRelations || isLoadingGoalTaskRelations;

  const goalTaskIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of goalTaskRelations) {
      const current = map.get(row.goal_id) ?? [];
      current.push(row.task_id);
      map.set(row.goal_id, current);
    }
    return map;
  }, [goalTaskRelations]);

  const taskGoalIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of goalTaskRelations) {
      const current = map.get(row.task_id) ?? [];
      current.push(row.goal_id);
      map.set(row.task_id, current);
    }
    return map;
  }, [goalTaskRelations]);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<Resource["type"]>(RESOURCE_TYPE.WEBSITE);
  const [status, setStatus] = useState<ResourceStatus>(RESOURCE_STATUS.INBOX);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [topicId, setTopicId] = useState<string>("");
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  /**
   * Flag flipped when the user manually picks a status. While set, the
   * context-driven auto-derive skips writing `status` so the user's pick
   * is preserved. Context changes reset the flag, so the system re-derives
   * (and overrides any prior pick) when the inputs that drive status change.
   */
  const statusOverriddenRef = useRef(false);
  /**
   * Tracks the last reset key (resource.id or "create") so the reset effect
   * only fires when the dialog opens or the entity being edited changes.
   * Without this guard, unstable parent props (e.g. inline `[goal.id]`
   * array literals for `initialGoalIds`) would re-trigger the effect on
   * every render and wipe the user's in-progress selections.
   */
  const lastResetKeyRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = "";
      // Closed: reset the override so a future open starts fresh.
      statusOverriddenRef.current = false;
      return;
    }

    const resetKey = resource?.id ?? "create";
    if (lastResetKeyRef.current === resetKey) {
      return;
    }
    lastResetKeyRef.current = resetKey;

    if (resource) {
      startTransition(() => {
        statusOverriddenRef.current = true;
        setName(resource.name);
        setUrl(resource.url ?? "");
        setType(resource.type);
        setStatus(resource.status as ResourceStatus);
        setAreaIds(resource.linkedAreaIds ?? (resource.area_id ? [resource.area_id] : []));
        setProjectIds(resource.linkedProjectIds ?? []);
        setTopicId(resource.topic_id ?? "");
        setGoalIds(resource.linkedGoalIds ?? []);
        setTaskIds(resource.linkedTaskIds ?? []);
      });
    } else {
      startTransition(() => {
        setName("");
        setUrl("");
        setType(RESOURCE_TYPE.WEBSITE);
        setStatus(
          deriveResourceStatus({
            area_ids: initialAreaIds,
            project_ids: initialProjectId ? [initialProjectId] : undefined,
            goal_ids: initialGoalIds,
            topic_id: initialTopicId,
          }),
        );
        setAreaIds(initialAreaIds ?? []);
        setProjectIds(initialProjectId ? [initialProjectId] : []);
        setTopicId(initialTopicId ?? "");
        setGoalIds(initialGoalIds ?? []);
        setTaskIds([]);
      });
    }
  }, [open, resource?.id, initialGoalIds, initialAreaIds, initialProjectId, initialTopicId]);

  // Live re-derive status from current context. Default behavior: keep the
  // user's pick. If the user hasn't manually overridden status, derive from
  // the current context so a contextless resource starts as `inbox` and a
  // linked one starts as `to_review`. Once the user picks, only a change to
  // a context input clears the override and re-derives (a wrong pick is
  // corrected only when the inputs that drive status change).
  useEffect(() => {
    if (statusOverriddenRef.current) {
      return;
    }
    const next = deriveResourceStatus({
      area_ids: areaIds,
      project_ids: projectIds,
      goal_ids: goalIds,
      task_ids: taskIds,
      topic_id: topicId || null,
    });
    if (next !== status) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaIds, projectIds, topicId, goalIds, taskIds]);

  const handleUserStatusChange = (next: ResourceStatus) => {
    statusOverriddenRef.current = true;
    setStatus(next);
  };

  const handleUrlBlur = () => {
    if (url && !name) {
      try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, "");
        setName(host);
      } catch {
        // invalid URL, keep name empty
      }
    }
  };

  const handleSubmit = () => {
    const baseInput = {
      name,
      url: url || null,
      type: type as Resource["type"],
      status: status as ResourceStatus,
      topic_id: topicId || null,
    };

    if (isEdit && resource) {
      const input: UpdateResourceInput = {
        ...baseInput,
        area_ids: areaIds.length > 0 ? areaIds : undefined,
        project_ids: projectIds.length > 0 ? projectIds : undefined,
        goal_ids: goalIds.length > 0 ? goalIds : undefined,
        task_ids: taskIds.length > 0 ? taskIds : undefined,
      };
      onSubmit(input);
    } else {
      const input: CreateResourceInput = {
        ...baseInput,
        area_ids: areaIds.length > 0 ? areaIds : undefined,
        project_ids: projectIds.length > 0 ? projectIds : undefined,
        goal_ids: goalIds.length > 0 ? goalIds : undefined,
        task_ids: taskIds.length > 0 ? taskIds : undefined,
      };
      onSubmit(input);
    }
  };

  const toggleArea = (areaId: string) => {
    setAreaIds((prev) => {
      const next = prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId];
      return next;
    });
  };

  const toggleGoal = (goalId: string) => {
    setGoalIds((prev) => {
      const next = prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId];
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setTaskIds((prev) => {
      const next = prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      return next;
    });
  };

  const toggleProject = (nextProjectId: string) => {
    setProjectIds((prev) =>
      prev.includes(nextProjectId) ? prev.filter((id) => id !== nextProjectId) : [...prev, nextProjectId],
    );
  };

  const relationPopoverContentClassName = "w-56 p-2 max-h-72 overflow-hidden";
  const relationOptionClassName =
    "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";

  // ── Derived selections ────────────────────────────────────────────────────
  const selectedProjects = useMemo(() => {
    if (projectIds.length === 0) return [];
    return projectIds
      .map((id) => projects.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [projectIds, projects]);

  const selectedTasks = useMemo(() => {
    return tasks.filter((t) => taskIds.includes(t.id));
  }, [taskIds, tasks]);

  const selectedGoals = useMemo(() => {
    return goals.filter((g) => goalIds.includes(g.id));
  }, [goalIds, goals]);

  // ── Areas filtering (AND-intersection) ─────────────────────────────────────
  const visibleAreas = useMemo(() => {
    return computeVisibleAreas(areas, selectedProjects[0] ?? null, selectedGoals, selectedTasks, areaIds);
  }, [areas, selectedProjects, selectedGoals, selectedTasks, areaIds]);

  // ── Projects filtering (AND-intersection) ──────────────────────────────────
  const filteredProjects = useMemo(() => {
    return computeFilteredProjects(projects, areaIds, goalIds, goalProjectIdsMap, selectedTasks, projectIds);
  }, [projects, areaIds, goalIds, goalProjectIdsMap, selectedTasks, projectIds]);

  // ── Goals filtering (AND-intersection) ─────────────────────────────────────
  const filteredGoals = useMemo(() => {
    return computeFilteredGoals(goals, areaIds, projectIds[0] ?? null, projectGoalIdsMap, taskGoalIdsMap, selectedTasks, goalIds);
  }, [goals, areaIds, projectIds, projectGoalIdsMap, taskGoalIdsMap, selectedTasks, goalIds]);

  // ── Tasks filtering (AND-intersection) ─────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return computeFilteredTasks(tasks, areaIds, projectIds[0] ?? null, goalIds, goalTaskIdsMap, taskIds);
  }, [tasks, areaIds, projectIds, goalIds, goalTaskIdsMap, taskIds]);

  // ── Clear invalid selections when filters change ───────────────────────────
  useEffect(() => {
    // Clear invalid areas
    if (isRelationsLoading) return;
    const validAreaIds = areaIds.filter((id) => visibleAreas.some((a) => a.id === id));
    if (validAreaIds.length !== areaIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAreaIds(validAreaIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAreas, isRelationsLoading]);

  useEffect(() => {
    // Clear invalid projects
    if (isRelationsLoading) return;
    const validProjectIds = projectIds.filter((id) => filteredProjects.some((p) => p.id === id));
    if (validProjectIds.length !== projectIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectIds(validProjectIds);
    }
  }, [filteredProjects, projectIds, isRelationsLoading]);

  useEffect(() => {
    // Clear invalid goals
    if (isRelationsLoading) return;
    const validGoalIds = goalIds.filter((id) => filteredGoals.some((g) => g.id === id));
    if (validGoalIds.length !== goalIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoalIds(validGoalIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGoals, isRelationsLoading]);

  useEffect(() => {
    // Clear invalid tasks
    if (isRelationsLoading) return;
    const validTaskIds = taskIds.filter((id) => filteredTasks.some((t) => t.id === id));
    if (validTaskIds.length !== taskIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskIds(validTaskIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks, isRelationsLoading]);

  const canSubmit = name.trim().length > 0 && url.trim().length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Resource" : "New Resource"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this external reference" : "Add an external reference to your PARA system"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="res-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="res-name"
              placeholder="My favorite article"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-required="true"
              required
              maxLength={255}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="res-url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="res-url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              aria-required="true"
              required
            />
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="res-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Resource["type"])}>
                <SelectTrigger id="res-type" className="w-full">
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
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => handleUserStatusChange(v as ResourceStatus)}>
                <SelectTrigger className="w-full">
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
          </div>

          {/* Area + Goals row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Areas — multi-select */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Areas</Label>
                <Popover>
                  <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {areaIds.length === 0 ? "Select areas..." : `${areaIds.length} selected`}
                  </PopoverTrigger>
                  <PopoverContent align="start" className={relationPopoverContentClassName}>
                    <button type="button" onClick={() => setAreaIds([])} className={relationOptionClassName}>
                      Clear selection
                    </button>
                    <div className="max-h-48 overflow-y-auto">
                      {visibleAreas.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {taskIds.length > 0 || goalIds.length > 0 || projectIds.length > 0
                            ? "No areas match selection."
                            : "No areas available."}
                        </div>
                      ) : (
                        visibleAreas.map((area) => (
                          <label key={area.id} className={relationOptionClassName}>
                            <Checkbox
                              checked={areaIds.includes(area.id)}
                              onCheckedChange={() => toggleArea(area.id)}
                            />
                            <span className="min-w-0 break-words">{area.icon ? `${area.icon} ` : ""}{area.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {areaIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {areaIds
                    .map((id) => areas.find((a) => a.id === id))
                    .filter((a): a is NonNullable<typeof a> => Boolean(a))
                    .map((area) => (
                      <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                        {area.icon ? `${area.icon} ` : ""}{area.name}
                        <button type="button" onClick={() => toggleArea(area.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Goals — multi-select */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Goals</Label>
                <Popover>
                  <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {goalIds.length === 0 ? "Select goals..." : `${goalIds.length} selected`}
                  </PopoverTrigger>
                  <PopoverContent align="start" className={relationPopoverContentClassName}>
                    <button type="button" onClick={() => setGoalIds([])} className={relationOptionClassName}>
                      Clear selection
                    </button>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredGoals.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {taskIds.length > 0 || projectIds.length > 0 || areaIds.length > 0
                            ? "No goals match selection."
                            : "No goals available."}
                        </div>
                      ) : (
                        filteredGoals.map((goal) => (
                          <label key={goal.id} className={relationOptionClassName}>
                            <Checkbox
                              checked={goalIds.includes(goal.id)}
                              onCheckedChange={() => toggleGoal(goal.id)}
                            />
                            {goal.name}
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {goalIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {goalIds
                    .map((id) => goals.find((g) => g.id === id))
                    .filter((g): g is NonNullable<typeof g> => Boolean(g))
                    .map((goal) => (
                      <Badge key={goal.id} variant="secondary" className="flex items-center gap-1">
                        {goal.name}
                        <button type="button" onClick={() => toggleGoal(goal.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Project + Tasks row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Project — single select with DropdownMenu style */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Projects</Label>
                <Popover>
                  <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {projectIds.length === 0 ? "Select projects..." : `${projectIds.length} selected`}
                  </PopoverTrigger>
                  <PopoverContent align="start" className={relationPopoverContentClassName}>
                    <button
                      type="button"
                      onClick={() => setProjectIds([])}
                      className={relationOptionClassName}
                    >
                      Clear selection
                    </button>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredProjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {taskIds.length > 0 || goalIds.length > 0 || areaIds.length > 0
                            ? "No projects match selection."
                            : "No projects available."}
                        </div>
                      ) : (
                        filteredProjects.map((project) => (
                          <label
                            key={project.id}
                            className={relationOptionClassName}
                          >
                            <Checkbox
                              checked={projectIds.includes(project.id)}
                              onCheckedChange={() => toggleProject(project.id)}
                            />
                            {project.name}
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedProjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedProjects.map((project) => (
                    <Badge key={project.id} variant="secondary" className="flex items-center gap-1">
                      <span className="text-xs leading-none">📁</span>
                      {project.name}
                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks — multi-select */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Tasks</Label>
                <Popover>
                  <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {taskIds.length === 0 ? "Select tasks..." : `${taskIds.length} selected`}
                  </PopoverTrigger>
                  <PopoverContent align="start" className={relationPopoverContentClassName}>
                    <button type="button" onClick={() => setTaskIds([])} className={relationOptionClassName}>
                      Clear selection
                    </button>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredTasks.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {goalIds.length > 0 || projectIds.length > 0 || areaIds.length > 0
                            ? "No tasks match selection."
                            : "No tasks available."}
                        </div>
                      ) : (
                        filteredTasks.map((task) => (
                          <label key={task.id} className={relationOptionClassName}>
                            <Checkbox
                              checked={taskIds.includes(task.id)}
                              onCheckedChange={() => toggleTask(task.id)}
                            />
                            <span className="min-w-0 break-words">{task.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {taskIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {taskIds
                    .map((id) => tasks.find((t) => t.id === id))
                    .filter((t): t is NonNullable<typeof t> => Boolean(t))
                    .map((task) => (
                      <Badge key={task.id} variant="secondary" className="flex items-center gap-1">
                        {task.name}
                        <button type="button" onClick={() => toggleTask(task.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Topic — single select, area-style layout */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Topic</Label>
              <Popover>
                <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {topicId ? (topics.find((t) => t.id === topicId)?.name ?? "Select topic...") : "Select topic..."}
                </PopoverTrigger>
                <PopoverContent align="start" className={relationPopoverContentClassName}>
                  <button type="button" onClick={() => setTopicId("")} className={relationOptionClassName}>
                    Clear selection
                  </button>
                  <div className="max-h-48 overflow-y-auto">
                    {topics.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No topics available.</div>
                    ) : (
                      topics.map((topic) => (
                        <label key={topic.id} className={relationOptionClassName}>
                          <Checkbox
                            checked={topicId === topic.id}
                            onCheckedChange={() => setTopicId(topicId === topic.id ? "" : topic.id)}
                          />
                          {topic.name}
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {topicId && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(() => {
                  const selected = topics.find((t) => t.id === topicId);
                  if (!selected) return null;
                  return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {selected.name}
                      <button type="button" onClick={() => setTopicId("")} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isEdit ? "Save Changes" : "Create Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
