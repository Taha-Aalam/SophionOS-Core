"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { type Priority, type TaskStatus } from "@/lib/utils/constants";

const EMPTY = "__none__";

export interface TaskItemValue {
  id: string;
  name: string;
  priority: Priority | "";
  status: TaskStatus | "";
  due_date: string | null;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  inbox: "Inbox",
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
};

interface TasksStepProps {
  value: TaskItemValue[];
  onChange: (value: TaskItemValue[]) => void;
}

function defaultTask(): TaskItemValue {
  return { id: crypto.randomUUID(), name: "", priority: "", status: "", due_date: null };
}

export function TasksStep({ value, onChange }: TasksStepProps) {
  function patch(index: number, partial: Partial<TaskItemValue>) {
    const next = [...value];
    next[index] = { ...next[index], ...partial };
    onChange(next);
  }

  function addTask() {
    if (value.length >= 3) return;
    onChange([...value, defaultTask()]);
  }

  function removeTask(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.map((task, i) => (
        <div key={task.id} className="space-y-2 rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Task ${i + 1} name`}
              value={task.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              autoFocus={i === 0}
              className="flex-1"
            />
            {value.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => removeTask(i)}
                aria-label={`Remove task ${i + 1}`}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={task.status || EMPTY}
                onValueChange={(v) => patch(i, { status: v === EMPTY ? "" : (v as TaskStatus) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={task.priority || EMPTY}
                onValueChange={(v) => patch(i, { priority: v === EMPTY ? "" : (v as Priority) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Medium" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-xs">Due</Label>
              <DatePicker
                value={task.due_date}
                onChange={(v) => patch(i, { due_date: v })}
              />
            </div>
          </div>
        </div>
      ))}

      {value.length < 3 && (
        <Button
          variant="outline"
          size="sm"
          className="mx-auto flex gap-1.5"
          onClick={addTask}
        >
          <Plus className="size-4" />
          Add task
        </Button>
      )}
    </div>
  );
}
