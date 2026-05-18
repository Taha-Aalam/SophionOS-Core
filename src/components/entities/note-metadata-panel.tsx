"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronDownIcon, Map, Pin, Star, Target, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { NOTE_STATUS, type NoteStatus } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

import { NoteTaskSelector } from "./note-task-selector";
import { NoteTypeCombobox } from "./note-type-combobox";

const STATUS_OPTIONS = [
  { value: NOTE_STATUS.INBOX, label: "Inbox" },
  { value: NOTE_STATUS.TO_REVIEW, label: "To Review" },
  { value: NOTE_STATUS.ACTIVE, label: "Active" },
  { value: NOTE_STATUS.SAVED, label: "Saved" },
];

interface NoteMetadataPanelProps {
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  noteTypes: { id: string; name: string; slug: string }[];
  topics?: TopicWithCounts[];
  topicId?: string;
  onTopicIdChange?: (id: string | null) => void;

  status: NoteStatus;
  type: string;
  notebook: string | null;
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  taskIds: string[];
  favorite: boolean;
  pin: boolean;

  onStatusChange: (status: NoteStatus) => void;
  onTypeChange: (type: string) => void;
  onNotebookChange: (notebook: string | null) => void;
  onNotebookBlur?: () => void;
  onAreaIdsChange: (areaIds: string[]) => void;
  onGoalIdsChange: (goalIds: string[]) => void;
  onProjectIdsChange: (projectIds: string[]) => void;
  onTaskIdsChange: (taskIds: string[]) => void;
  onFavoriteChange: (favorite: boolean) => void;
  onPinChange: (pin: boolean) => void;

  disabled?: boolean;
}

export function NoteMetadataPanel({
  areas,
  goals,
  projects,
  tasks,
  noteTypes,
  topics = [],
  topicId,
  onTopicIdChange,
  status,
  type,
  notebook,
  areaIds,
  goalIds,
  projectIds,
  taskIds,
  favorite,
  pin,
  onStatusChange,
  onTypeChange,
  onNotebookChange,
  onNotebookBlur,
  onAreaIdsChange,
  onGoalIdsChange,
  onProjectIdsChange,
  onTaskIdsChange,
  onFavoriteChange,
  onPinChange,
  disabled,
}: NoteMetadataPanelProps) {
  const activeAreas = useMemo(() => areas.filter((a) => !a.archive), [areas]);
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_archived).sort((a, b) => a.name.localeCompare(b.name)),
    [goals],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => !p.is_archived).sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );

  const selectedAreaLabels = useMemo(
    () =>
      areaIds
        .map((id) => activeAreas.find((a) => a.id === id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a)),
    [areaIds, activeAreas],
  );

  const selectedGoalLabels = useMemo(
    () =>
      goalIds
        .map((id) => activeGoals.find((g) => g.id === id))
        .filter((g): g is NonNullable<typeof g> => Boolean(g)),
    [goalIds, activeGoals],
  );

  const filteredAreas = useMemo(() => {
    const hasConstraints = goalIds.length > 0 || projectIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeAreas;
    const allowed = new Set<string>();
    for (const gId of goalIds) {
      const goal = goals.find((g) => g.id === gId);
      for (const aId of goal?.linkedAreaIds ?? []) allowed.add(aId);
    }
    for (const pId of projectIds) {
      const proj = activeProjects.find((p) => p.id === pId);
      for (const aId of proj?.linkedAreaIds ?? []) allowed.add(aId);
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) {
        const proj = activeProjects.find((p) => p.id === task.project_id);
        for (const aId of proj?.linkedAreaIds ?? []) allowed.add(aId);
      }
    }
    return activeAreas.filter((a) => allowed.has(a.id));
  }, [activeAreas, goalIds, projectIds, taskIds, goals, activeProjects, tasks]);

  const filteredGoals = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || projectIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeGoals;
    const allowed = new Set<string>();
    for (const aId of areaIds) {
      for (const g of activeGoals) {
        if (g.linkedAreaIds?.includes(aId)) allowed.add(g.id);
      }
    }
    for (const pId of projectIds) {
      const proj = activeProjects.find((p) => p.id === pId);
      for (const gId of proj?.linkedGoalIds ?? []) allowed.add(gId);
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) {
        const proj = activeProjects.find((p) => p.id === task.project_id);
        for (const gId of proj?.linkedGoalIds ?? []) allowed.add(gId);
      }
    }
    return activeGoals.filter((g) => allowed.has(g.id));
  }, [activeGoals, areaIds, projectIds, taskIds, activeProjects, tasks]);

  const filteredProjects = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || goalIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeProjects;
    const allowed = new Set<string>();
    for (const aId of areaIds) {
      for (const p of activeProjects) {
        if (p.linkedAreaIds?.includes(aId)) allowed.add(p.id);
      }
    }
    for (const gId of goalIds) {
      for (const p of activeProjects) {
        if (p.linkedGoalIds?.includes(gId)) allowed.add(p.id);
      }
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) allowed.add(task.project_id);
    }
    return activeProjects.filter((p) => allowed.has(p.id));
  }, [activeProjects, areaIds, goalIds, taskIds, tasks]);

  const filteredTasks = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || goalIds.length > 0 || projectIds.length > 0;
    if (!hasConstraints) return tasks;
    const allowedProjectIds = new Set<string>(projectIds);
    for (const aId of areaIds) {
      for (const p of activeProjects) {
        if (p.linkedAreaIds?.includes(aId)) allowedProjectIds.add(p.id);
      }
    }
    for (const gId of goalIds) {
      for (const p of activeProjects) {
        if (p.linkedGoalIds?.includes(gId)) allowedProjectIds.add(p.id);
      }
    }
    return tasks.filter((t) => t.project_id !== null && allowedProjectIds.has(t.project_id!));
  }, [tasks, areaIds, goalIds, projectIds, activeProjects]);

  const toggleArea = (areaId: string) => {
    onAreaIdsChange(
      areaIds.includes(areaId) ? areaIds.filter((id) => id !== areaId) : [...areaIds, areaId],
    );
  };

  const toggleGoal = (goalId: string) => {
    onGoalIdsChange(
      goalIds.includes(goalId) ? goalIds.filter((id) => id !== goalId) : [...goalIds, goalId],
    );
  };

  const toggleProject = (projectId: string) => {
    onProjectIdsChange(
      projectIds.includes(projectId)
        ? projectIds.filter((id) => id !== projectId)
        : [...projectIds, projectId],
    );
  };

  const selectedProjectLabels = useMemo(
    () =>
      projectIds
        .map((id) => activeProjects.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [projectIds, activeProjects],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={status} onValueChange={(v) => onStatusChange(v as NoteStatus)} disabled={disabled}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <NoteTypeCombobox
          value={type}
          options={noteTypes}
          onChange={onTypeChange}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={favorite ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => onFavoriteChange(!favorite)}
          disabled={disabled}
        >
          <Star className={cn("size-3.5", favorite && "fill-current")} />
          {favorite ? "Favorited" : "Favorite"}
        </Button>
        <Button
          type="button"
          variant={pin ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => onPinChange(!pin)}
          disabled={disabled}
        >
          <Pin className={cn("size-3.5", pin && "fill-current")} />
          {pin ? "Pinned" : "Pin"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          <BookOpen className="mr-1 inline size-3" />
          Notebook
        </Label>
        <Input
          value={notebook ?? ""}
          onChange={(e) => onNotebookChange(e.target.value.trim() || null)}
          onBlur={onNotebookBlur}
          placeholder="e.g. Work, Ideas…"
          className="h-8 text-sm"
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          <Map className="mr-1 inline size-3" />
          Areas
        </Label>
        <AreaSelector
          areas={filteredAreas}
          selectedIds={areaIds}
          onToggle={toggleArea}
          disabled={disabled}
        />
        {selectedAreaLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedAreaLabels.map((area) => (
              <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                {area.icon ? `${area.icon} ` : ""}
                <span className="max-w-[120px] truncate">{area.name}</span>
                <button
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          <Target className="mr-1 inline size-3" />
          Goals
        </Label>
        <GoalSelector
          goals={filteredGoals}
          selectedIds={goalIds}
          onToggle={toggleGoal}
          disabled={disabled}
        />
        {selectedGoalLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedGoalLabels.map((goal) => (
              <Badge key={goal.id} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-[120px] truncate">{goal.name}</span>
                <button
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Projects</Label>
        <ProjectSelector
          projects={filteredProjects}
          selectedIds={projectIds}
          onToggle={toggleProject}
          disabled={disabled}
        />
        {selectedProjectLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedProjectLabels.map((project) => (
              <Badge key={project.id} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-[120px] truncate">{project.name}</span>
                <button
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tasks</Label>
        <NoteTaskSelector
          tasks={filteredTasks}
          selectedIds={taskIds}
          onChange={onTaskIdsChange}
          disabled={disabled}
        />
      </div>

      {topics.length > 0 && onTopicIdChange && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Topic</Label>
          <TopicSelector
            topics={topics}
            selectedId={topicId ?? null}
            onChange={onTopicIdChange}
            disabled={disabled}
          />
          {topicId && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(() => {
                const selected = topics.find((t) => t.id === topicId);
                if (!selected) return null;
                return (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span className="max-w-[120px] truncate">{selected.name}</span>
                    <button
                      type="button"
                      onClick={() => onTopicIdChange(null)}
                      className="rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AreaSelector({
  areas,
  selectedIds,
  onToggle,
  disabled,
}: {
  areas: Area[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  }, [areas, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {selectedIds.length === 0 ? "Select areas..." : `${selectedIds.length} selected`}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search areas..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No areas found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((area) => (
                <CommandItem
                  key={area.id}
                  value={area.id}
                  onSelect={() => onToggle(area.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(area.id)} />
                  <span className="text-sm">
                    {area.icon ? `${area.icon} ` : ""}
                    {area.name}
                  </span>
                  {selectedSet.has(area.id) && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GoalSelector({
  goals,
  selectedIds,
  onToggle,
  disabled,
}: {
  goals: Goal[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return goals;
    return goals.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));
  }, [goals, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {selectedIds.length === 0 ? "Select goals..." : `${selectedIds.length} selected`}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search goals..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No goals found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((goal) => (
                <CommandItem
                  key={goal.id}
                  value={goal.id}
                  onSelect={() => onToggle(goal.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(goal.id)} />
                  <span className="flex-1 truncate text-sm">{goal.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {goal.term}
                  </Badge>
                  {selectedSet.has(goal.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TopicSelector({
  topics,
  selectedId,
  onChange,
  disabled,
}: {
  topics: TopicWithCounts[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return topics;
    return topics.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  }, [topics, query]);

  const handleSelect = (id: string) => {
    onChange(selectedId === id ? null : id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {!selectedId
            ? "Select topic..."
            : (topics.find((t) => t.id === selectedId)?.name ?? "Select topic...")}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search topics..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No topics found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((topic) => (
                <CommandItem
                  key={topic.id}
                  value={topic.id}
                  onSelect={() => handleSelect(topic.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedId === topic.id} />
                  <span className="flex-1 truncate text-sm">{topic.name}</span>
                  {selectedId === topic.id && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProjectSelector({
  projects,
  selectedIds,
  onToggle,
  disabled,
}: {
  projects: Project[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [projects, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {selectedIds.length === 0 ? "Select projects..." : `${selectedIds.length} selected`}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search projects..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={() => onToggle(project.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(project.id)} />
                  <span className="flex-1 truncate text-sm">{project.name}</span>
                  {selectedSet.has(project.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
