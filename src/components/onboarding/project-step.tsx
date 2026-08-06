"use client";

import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  type Priority,
  type ProjectStatus,
} from "@/lib/utils/constants";

const EMPTY = "__none__";

export interface ProjectStepValue {
  name: string;
  description: string;
  status: ProjectStatus | "";
  priority: Priority | "";
  start_date: string | null;
  due_date: string | null;
  area_ids: string[];
  goal_ids: string[];
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_LABELS: Record<string, string> = {
  inbox: "Inbox",
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};

interface ProjectStepProps {
  value: ProjectStepValue;
  onChange: (value: ProjectStepValue) => void;
  /** Goal created in previous step — used to auto-link. */
  createdGoal?: { id: string; area_ids: string[] } | null;
}

export function ProjectStep({ value, onChange, createdGoal }: ProjectStepProps) {
  const { data: areas, isLoading, isError } = useAreas();

  // Auto-link goal + inherit area from goal when goal step completes
  useEffect(() => {
    if (!createdGoal) return;
    const goalId = createdGoal.id;
    const goalAreaIds = createdGoal.area_ids ?? [];
    const nextGoalIds = value.goal_ids.includes(goalId)
      ? value.goal_ids
      : [...value.goal_ids, goalId];
    const nextAreaIds = goalAreaIds.filter(
      (id) => !value.area_ids.includes(id),
    );
    if (nextGoalIds.length !== value.goal_ids.length || nextAreaIds.length > 0) {
      onChange({
        ...value,
        goal_ids: nextGoalIds,
        area_ids: [...value.area_ids, ...nextAreaIds],
      });
    }
    // Only re-run when createdGoal changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdGoal]);

  function patch(partial: Partial<ProjectStepValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-project-name">Project name</Label>
        <Input
          id="onboarding-project-name"
          placeholder="e.g. 12-week training plan"
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-project-description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="onboarding-project-description"
          placeholder="What does this project deliver?"
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={3}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status <span className="text-muted-foreground">(optional)</span></Label>
        <Select
          value={value.status || EMPTY}
          onValueChange={(v) => patch({ status: v === EMPTY ? "" : (v as ProjectStatus) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority <span className="text-muted-foreground">(optional)</span></Label>
        <Select
          value={value.priority || EMPTY}
          onValueChange={(v) => patch({ priority: v === EMPTY ? "" : (v as Priority) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
              ([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start date <span className="text-muted-foreground">(optional)</span></Label>
          <DatePicker
            value={value.start_date}
            onChange={(v) => patch({ start_date: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Due date <span className="text-muted-foreground">(optional)</span></Label>
          <DatePicker
            value={value.due_date}
            onChange={(v) => patch({ due_date: v })}
          />
        </div>
      </div>

      {/* Area linking (auto-populated from goal, but editable) */}
      <div className="space-y-2">
        <Label>Areas <span className="text-muted-foreground">(optional)</span></Label>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load areas. You can continue and link areas later.</p>
        ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Areas">
          {areas?.map((area) => {
            const selected = value.area_ids.includes(area.id);
            return (
              <button
                key={area.id}
                type="button"
                aria-pressed={selected}
                aria-label={area.name}
                onClick={() =>
                  patch({
                    area_ids: selected
                      ? value.area_ids.filter((id) => id !== area.id)
                      : [...value.area_ids, area.id],
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span>{area.icon}</span>
                {area.name}
              </button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
