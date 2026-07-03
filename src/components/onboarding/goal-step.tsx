"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface GoalStepValue {
  name: string;
  description: string;
}

export function GoalStep({
  value,
  onChange,
}: {
  value: GoalStepValue;
  onChange: (value: GoalStepValue) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-goal-name">Goal name</Label>
        <Input
          id="onboarding-goal-name"
          placeholder="e.g. Run a half marathon"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
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
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
