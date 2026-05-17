"use client";

import { useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useMemo, useState } from "react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  { value: RESOURCE_STATUS.SAVED, label: "Saved" },
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
}: ResourceDialogProps) {
  const isEdit = !!resource;
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: topics = [] } = useTopics();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: tasks = [] } = useTasks();

  // Fetch relation tables for cross-filtering
  const { data: goalProjectRelations = [], isLoading: isLoadingGoalProjectRelations } = useQuery({
    queryKey: ["goal-project-relations"],
    queryFn: async () => {
      const { data } = await createClient().from("goal_projects").select("goal_id, project_id");
      return data ?? [];
    },
    enabled: open,
  });

  const { data: goalTaskRelations = [], isLoading: isLoadingGoalTaskRelations } = useQuery({
    queryKey: ["goal-task-relations"],
    queryFn: async () => {
      const { data } = await createClient().from("goal_tasks").select("goal_id, task_id");
      return data ?? [];
    },
    enabled: open,
  });

  const isRelationsLoading = isLoadingGoalProjectRelations || isLoadingGoalTaskRelations;

  // Build bidirectional lookup maps
  const goalProjectIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of goalProjectRelations) {
      const current = map.get(row.goal_id) ?? [];
      current.push(row.project_id);
      map.set(row.goal_id, current);
    }
    return map;
  }, [goalProjectRelations]);

  const projectGoalIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of goalProjectRelations) {
      const current = map.get(row.project_id) ?? [];
      current.push(row.goal_id);
      map.set(row.project_id, current);
    }
    return map;
  }, [goalProjectRelations]);

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
  const [projectId, setProjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && resource) {
      startTransition(() => {
        setName(resource.name);
        setUrl(resource.url ?? "");
        setType(resource.type);
        setStatus(resource.status as ResourceStatus);
        setAreaIds(resource.linkedAreaIds ?? (resource.area_id ? [resource.area_id] : []));
        setProjectId(resource.project_id ?? "");
        setTopicId(resource.topic_id ?? "");
        setGoalIds(resource.linkedGoalIds ?? []);
        setTaskIds(resource.linkedTaskIds ?? []);
      });
    } else if (open) {
      startTransition(() => {
        setName("");
        setUrl("");
        setType(RESOURCE_TYPE.WEBSITE);
        setStatus(RESOURCE_STATUS.INBOX);
        setAreaIds(initialAreaIds ?? []);
        setProjectId(initialProjectId ?? "");
        setTopicId("");
        setGoalIds(initialGoalIds ?? []);
        setTaskIds([]);
      });
    }
  }, [open, resource, initialGoalIds, initialAreaIds, initialProjectId]);

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
      project_id: projectId || null,
      topic_id: topicId || null,
    };

    if (isEdit && resource) {
      const input: UpdateResourceInput = {
        ...baseInput,
        area_ids: areaIds.length > 0 ? areaIds : undefined,
        goal_ids: goalIds.length > 0 ? goalIds : undefined,
        task_ids: taskIds.length > 0 ? taskIds : undefined,
      };
      onSubmit(input);
    } else {
      const input: CreateResourceInput = {
        ...baseInput,
        area_ids: areaIds.length > 0 ? areaIds : undefined,
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
    const isDeselecting = projectId === nextProjectId;
    setProjectId(isDeselecting ? "" : nextProjectId);
  };

  const relationPopoverContentClassName = "w-56 p-2";
  const relationOptionClassName =
    "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";

  // ── Derived selections ────────────────────────────────────────────────────
  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) ?? null;
  }, [projectId, projects]);

  const selectedTasks = useMemo(() => {
    return tasks.filter((t) => taskIds.includes(t.id));
  }, [taskIds, tasks]);

  const selectedGoals = useMemo(() => {
    return goals.filter((g) => goalIds.includes(g.id));
  }, [goalIds, goals]);

  // ── Areas filtering ───────────────────────────────────────────────────────
  // Rule: if tasks selected → only task areas
  // Rule: if goals selected → only goal areas
  // Rule: if project selected → only project areas
  const visibleAreas = useMemo(() => {
    if (taskIds.length > 0) {
      const taskAreaIds = new Set(
        selectedTasks.flatMap((t) => t.linkedAreaIds ?? [t.area_id]).filter(Boolean),
      );
      return areas.filter((a) => taskAreaIds.has(a.id));
    }
    if (goalIds.length > 0) {
      const goalAreaIds = new Set(
        selectedGoals.flatMap((g) => g.linkedAreaIds ?? [g.area_id]).filter(Boolean),
      );
      return areas.filter((a) => goalAreaIds.has(a.id));
    }
    if (selectedProject) {
      const projectAreaIds = new Set(
        selectedProject.linkedAreaIds ?? [selectedProject.area_id].filter(Boolean),
      );
      return areas.filter((a) => projectAreaIds.has(a.id));
    }
    return areas;
  }, [areas, selectedTasks, selectedGoals, selectedProject, taskIds.length, goalIds.length]);

  // ── Projects filtering ─────────────────────────────────────────────────────
  // Rule: if tasks selected → only task projects
  // Rule: if goals selected → only goal-linked projects
  // Rule: if areas selected → only area-linked projects
  const filteredProjects = useMemo(() => {
    if (taskIds.length > 0) {
      const taskProjectIds = new Set(selectedTasks.map((t) => t.project_id).filter(Boolean));
      return projects.filter((p) => taskProjectIds.has(p.id));
    }
    if (goalIds.length > 0) {
      const linkedProjectIds = new Set<string>();
      for (const goalId of goalIds) {
        (goalProjectIdsMap.get(goalId) ?? []).forEach((id) => linkedProjectIds.add(id));
      }
      return projects.filter((p) => linkedProjectIds.has(p.id));
    }
    if (areaIds.length > 0) {
      const selectedAreaIds = new Set(areaIds);
      return projects.filter((p) => {
        const projectAreaIds = new Set(p.linkedAreaIds ?? [p.area_id].filter(Boolean));
        return Array.from(selectedAreaIds).some((id) => projectAreaIds.has(id));
      });
    }
    return projects;
  }, [projects, selectedTasks, goalIds, areaIds, goalProjectIdsMap]);

  // ── Goals filtering ──────────────────────────────────────────────────────
  // Rule: if tasks selected → goals linked to those tasks OR to tasks' projects
  // Rule: if project selected → goals linked to that project
  // Rule: if areas selected → goals linked to those areas
  const filteredGoals = useMemo(() => {
    if (taskIds.length > 0) {
      const linkedGoalIds = new Set<string>();
      for (const taskId of taskIds) {
        (taskGoalIdsMap.get(taskId) ?? []).forEach((id) => linkedGoalIds.add(id));
      }
      for (const task of selectedTasks) {
        if (task.project_id) {
          (projectGoalIdsMap.get(task.project_id) ?? []).forEach((id) => linkedGoalIds.add(id));
        }
      }
      return goals.filter((g) => linkedGoalIds.has(g.id));
    }
    if (projectId) {
      const linkedGoalIds = new Set(projectGoalIdsMap.get(projectId) ?? []);
      return goals.filter((g) => linkedGoalIds.has(g.id));
    }
    if (areaIds.length > 0) {
      const selectedAreaIds = new Set(areaIds);
      return goals.filter((g) => {
        const goalAreaIds = new Set(g.linkedAreaIds ?? [g.area_id].filter(Boolean));
        return Array.from(selectedAreaIds).some((id) => goalAreaIds.has(id));
      });
    }
    return goals;
  }, [goals, taskIds, selectedTasks, projectId, areaIds, taskGoalIdsMap, projectGoalIdsMap]);

  // ── Tasks filtering ──────────────────────────────────────────────────────
  // Rule: if goals selected → only tasks linked to those goals
  // Rule: if project selected → only tasks for that project
  // Rule: if areas selected → only tasks linked to those areas
  const filteredTasks = useMemo(() => {
    if (goalIds.length > 0) {
      const linkedTaskIds = new Set<string>();
      for (const goalId of goalIds) {
        (goalTaskIdsMap.get(goalId) ?? []).forEach((id) => linkedTaskIds.add(id));
      }
      return tasks.filter((t) => linkedTaskIds.has(t.id));
    }
    if (projectId) {
      return tasks.filter((t) => t.project_id === projectId);
    }
    if (areaIds.length > 0) {
      const selectedAreaIds = new Set(areaIds);
      return tasks.filter((t) => {
        const taskAreaIds = new Set(t.linkedAreaIds ?? [t.area_id].filter(Boolean));
        return Array.from(selectedAreaIds).some((id) => taskAreaIds.has(id));
      });
    }
    return tasks;
  }, [tasks, goalIds, projectId, areaIds, goalTaskIdsMap]);

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
    if (projectId && !filteredProjects.some((p) => p.id === projectId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectId("");
    }
  }, [filteredProjects, projectId, isRelationsLoading]);

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

  const canSubmit = name.trim().length > 0 && !isPending;

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
            <Label htmlFor="res-name">Name</Label>
            <Input
              id="res-name"
              placeholder="My favorite article"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="res-url">URL</Label>
            <Input
              id="res-url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="res-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Resource["type"])}>
                <SelectTrigger id="res-type">
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
              <Label htmlFor="res-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ResourceStatus)}>
                <SelectTrigger id="res-status">
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
          <div className="grid grid-cols-2 gap-4">
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
                    <ScrollArea className="max-h-56">
                      {visibleAreas.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {taskIds.length > 0 || goalIds.length > 0 || projectId
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
                            {area.icon ? `${area.icon} ` : ""}{area.name}
                          </label>
                        ))
                      )}
                    </ScrollArea>
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
                    <ScrollArea className="max-h-56">
                      {filteredGoals.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {taskIds.length > 0 || projectId || areaIds.length > 0
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
                    </ScrollArea>
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
          <div className="grid grid-cols-2 gap-4">
            {/* Project — single select with DropdownMenu style */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Project</Label>
                <Popover>
                  <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {!projectId ? "Select project..." : (selectedProject?.name ?? "...")}
                  </PopoverTrigger>
                  <PopoverContent align="start" className={relationPopoverContentClassName}>
                    <button
                      type="button"
                      onClick={() => setProjectId("")}
                      className={relationOptionClassName}
                    >
                      <span className="text-muted-foreground">None</span>
                    </button>
                    <ScrollArea className="max-h-56">
                      {filteredProjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No projects available.
                        </div>
                      ) : (
                        filteredProjects.map((project) => (
                          <label
                            key={project.id}
                            className={relationOptionClassName}
                          >
                            <Checkbox
                              checked={projectId === project.id}
                              onCheckedChange={() => toggleProject(project.id)}
                            />
                            {project.name}
                          </label>
                        ))
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedProject && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {selectedProject.name}
                    <button type="button" onClick={() => setProjectId("")} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                      <X className="size-3" />
                    </button>
                  </Badge>
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
                    <ScrollArea className="max-h-56">
                      {filteredTasks.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {goalIds.length > 0 || projectId || areaIds.length > 0
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
                            {task.name}
                          </label>
                        ))
                      )}
                    </ScrollArea>
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

          {/* Topic — single select */}
          <div className="grid gap-2">
            <Label htmlFor="res-topic">Topic</Label>
            <Select value={topicId} onValueChange={(v) => setTopicId(v ?? "")}>
              <SelectTrigger id="res-topic">
                <SelectValue placeholder="None">
                  {topicId ? topics.find((t) => t.id === topicId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
