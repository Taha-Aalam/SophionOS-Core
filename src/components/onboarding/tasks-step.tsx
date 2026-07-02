"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TasksStepValue = string[];

/**
 * Three lightweight task-name inputs. Blank rows are ignored on submit, so a
 * user can add one to three starter tasks without any being mandatory.
 */
export function TasksStep({
  value,
  onChange,
  projectName,
}: {
  value: TasksStepValue;
  onChange: (value: TasksStepValue) => void;
  projectName?: string;
}) {
  const rows = [0, 1, 2];

  function setRow(index: number, next: string) {
    const copy = [...value];
    copy[index] = next;
    onChange(copy);
  }

  return (
    <div className="space-y-4">
      {projectName ? (
        <p className="text-center text-sm text-muted-foreground">
          The next small actions for{" "}
          <span className="font-medium text-foreground">{projectName}</span>.
        </p>
      ) : null}
      <div className="space-y-3">
        {rows.map((i) => (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={`onboarding-task-${i}`} className="sr-only">
              Task {i + 1}
            </Label>
            <Input
              id={`onboarding-task-${i}`}
              placeholder={i === 0 ? "First task…" : "Another task (optional)"}
              value={value[i] ?? ""}
              onChange={(e) => setRow(i, e.target.value)}
              autoFocus={i === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
