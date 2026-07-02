"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProjectStepValue {
  name: string;
  description: string;
}

export function ProjectStep({
  value,
  onChange,
  goalName,
}: {
  value: ProjectStepValue;
  onChange: (value: ProjectStepValue) => void;
  goalName?: string;
}) {
  return (
    <div className="space-y-4">
      {goalName ? (
        <p className="text-center text-sm text-muted-foreground">
          A project that moves{" "}
          <span className="font-medium text-foreground">{goalName}</span> forward.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="onboarding-project-name">Project name</Label>
        <Input
          id="onboarding-project-name"
          placeholder="e.g. Couch to 5K training plan"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-project-description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="onboarding-project-description"
          placeholder="What this project covers."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
