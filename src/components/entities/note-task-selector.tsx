"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

interface NoteTaskSelectorProps {
  tasks: Task[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NoteTaskSelector({
  tasks,
  selectedIds,
  onChange,
  disabled,
  placeholder = "Link tasks...",
}: NoteTaskSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tasks;
    return tasks.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  }, [tasks, query]);

  const selectedTasks = useMemo(
    () => selectedIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[],
    [selectedIds, tasks],
  );

  const toggle = (taskId: string) => {
    const next = selectedSet.has(taskId)
      ? selectedIds.filter((id) => id !== taskId)
      : [...selectedIds, taskId];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm font-normal"
            disabled={disabled}
          >
            <span className="truncate">
              {selectedIds.length === 0 ? placeholder : `${selectedIds.length} linked`}
            </span>
            <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tasks..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-56 overflow-y-auto">
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.id}
                    onSelect={() => toggle(task.id)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={selectedSet.has(task.id)} />
                    <span className="flex-1 truncate text-sm">{task.name}</span>
                    {selectedSet.has(task.id) && <Check className="size-3.5" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTasks.map((task) => (
            <Badge key={task.id} variant="secondary" className="flex items-center gap-1">
              <span className="max-w-[120px] truncate">{task.name}</span>
              <button
                type="button"
                onClick={() => toggle(task.id)}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
