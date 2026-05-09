"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDownIcon, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

interface NoteTypeComboboxProps {
  value: string;
  options: { id: string; name: string; slug: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NoteTypeCombobox({
  value,
  options,
  onChange,
  disabled,
  placeholder = "Select or create type...",
}: NoteTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((o) => o.name.toLowerCase().includes(normalizedQuery));
  }, [options, normalizedQuery]);

  const canCreate = useMemo(() => {
    if (!normalizedQuery) return false;
    return !options.some((o) => o.name.toLowerCase() === normalizedQuery);
  }, [options, normalizedQuery]);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.slug === value || o.name.toLowerCase() === value.toLowerCase());
    return found?.name ?? value;
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        {value ? selectedLabel : placeholder}
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create type..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "flex w-full items-center gap-2 text-sm",
                  )}
                  onClick={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="size-3.5" />
                  Create &quot;{query.trim()}&quot;
                </button>
              ) : (
                "No types found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.slug}
                  onSelect={() => {
                    onChange(option.name);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      value.toLowerCase() === option.name.toLowerCase() ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={`__create__${query.trim()}`}
                  onSelect={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="mr-2 size-3.5" />
                  Create &quot;{query.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
