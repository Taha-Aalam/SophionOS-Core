"use client";

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
import { type GoalTerm, type Priority } from "@/lib/utils/constants";

const EMPTY = "__none__";

export interface GoalStepValue {
  name: string;
  description: string;
  area_ids: string[];
  term: GoalTerm | "";
  priority: Priority | "";
  target_date: string | null;
}

const GOAL_TERM_LABELS: Record<GoalTerm, string> = {
  short: "Short-term",
  mid: "Mid-term",
  long: "Long-term",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function GoalStep({
  value,
  onChange,
}: {
  value: GoalStepValue;
  onChange: (value: GoalStepValue) => void;
}) {
  const { data: areas, isLoading, isError } = useAreas();

  function patch(partial: Partial<GoalStepValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-goal-name">Goal name</Label>
        <Input
          id="onboarding-goal-name"
          placeholder="e.g. Run a half marathon"
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-goal-description">
          Why it matters <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="onboarding-goal-description"
          placeholder="A sentence on what success looks like."
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={3}
        />
      </div>

      {/* Area linking */}
      <div className="space-y-2">
        <Label>Link to area <span className="text-muted-foreground">(optional)</span></Label>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load areas. You can continue and link areas later.</p>
        ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Link to area">
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

      {/* Term */}
      <div className="space-y-2">
        <Label>Term <span className="text-muted-foreground">(optional)</span></Label>
        <Select
          value={value.term || EMPTY}
          onValueChange={(v) => patch({ term: v === EMPTY ? "" : (v as GoalTerm) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(GOAL_TERM_LABELS) as [GoalTerm, string][]).map(
              ([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ),
            )}
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

      {/* Target date */}
      <div className="space-y-2">
        <Label>Target date <span className="text-muted-foreground">(optional)</span></Label>
        <DatePicker
          value={value.target_date}
          onChange={(v) => patch({ target_date: v })}
        />
      </div>
    </div>
  );
}
