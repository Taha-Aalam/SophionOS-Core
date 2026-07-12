"use client";

import { Check, Filter, ListFilter, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type LinearFilterOperator = "is" | "is any of";

export type LinearFilterOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

export type LinearFilterTypeConfig = {
  type: string;
  label: string;
  icon?: React.ReactNode;
  options: LinearFilterOption[];
  /** default multi */
  selection?: "single" | "multi";
};

export type LinearFilter = {
  id: string;
  type: string;
  operator: LinearFilterOperator;
  value: string[];
};

function newFilterId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveOperator(
  selection: "single" | "multi",
  values: string[],
): LinearFilterOperator {
  if (selection === "single") return "is";
  return values.length > 1 ? "is any of" : "is";
}

function FilterValueCombobox({
  config,
  filterValues,
  setFilterValues,
}: {
  config: LinearFilterTypeConfig;
  filterValues: string[];
  setFilterValues: (values: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const isMulti = (config.selection ?? "multi") === "multi";

  const selected = config.options.filter((opt) => filterValues.includes(opt.value));
  const unselected = config.options.filter((opt) => !filterValues.includes(opt.value));

  const displayLabel =
    selected.length === 0
      ? "Select"
      : selected.length === 1
        ? selected[0]!.label
        : `${selected.length} selected`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTimeout(() => setQuery(""), 150);
        }
      }}
    >
      <PopoverTrigger
        className={cn(
          "shrink-0 bg-muted px-1.5 py-1 text-muted-foreground transition",
          "hover:bg-muted/50 hover:text-primary",
        )}
      >
        <div className="flex max-w-[180px] items-center gap-1.5 truncate">
          {selected.slice(0, 3).map((opt) =>
            opt.icon ? (
              <span key={opt.value} className="inline-flex shrink-0">
                {opt.icon}
              </span>
            ) : null,
          )}
          <span className="truncate">{displayLabel}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput
            placeholder={config.label}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {selected.length > 0 && (
              <CommandGroup>
                {selected.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    className="flex items-center gap-2"
                    onSelect={() => {
                      const next = filterValues.filter((v) => v !== opt.value);
                      setFilterValues(next);
                      if (!isMulti) setOpen(false);
                    }}
                  >
                    {isMulti ? <Checkbox checked /> : null}
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                    {!isMulti ? <Check className="ml-auto size-3.5 opacity-100" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {unselected.length > 0 && selected.length > 0 ? <CommandSeparator /> : null}
            {unselected.length > 0 && (
              <CommandGroup>
                {unselected.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    className="flex items-center gap-2"
                    onSelect={() => {
                      if (isMulti) {
                        setFilterValues([...filterValues, opt.value]);
                      } else {
                        setFilterValues([opt.value]);
                        setOpen(false);
                      }
                    }}
                  >
                    {isMulti ? (
                      <Checkbox checked={false} className="opacity-50" />
                    ) : null}
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AddFilterButton({
  types,
  existingTypes,
  onAdd,
}: {
  types: LinearFilterTypeConfig[];
  existingTypes: Set<string>;
  onAdd: (type: string, firstValue: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const availableTypes = types.filter((t) => !existingTypes.has(t.type));
  const activeConfig = types.find((t) => t.type === selectedType) ?? null;

  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSelectedType(null);
        setQuery("");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-dashed px-2 text-xs text-muted-foreground"
          />
        }
      >
        <ListFilter className="size-3.5" />
        Filter
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput
            placeholder={selectedType ? activeConfig?.label ?? "Filter..." : "Filter..."}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {!selectedType ? (
              <CommandGroup>
                {availableTypes.length === 0 ? (
                  <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                    All filters applied
                  </div>
                ) : (
                  availableTypes.map((type) => (
                    <CommandItem
                      key={type.type}
                      value={type.label}
                      className="flex items-center gap-2"
                      onSelect={() => {
                        setSelectedType(type.type);
                        setQuery("");
                      }}
                    >
                      {type.icon}
                      <span>{type.label}</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            ) : (
              <CommandGroup>
                {(activeConfig?.options ?? []).map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    className="flex items-center gap-2"
                    onSelect={() => {
                      onAdd(activeConfig!.type, opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type LinearFiltersProps = {
  types: LinearFilterTypeConfig[];
  filters: LinearFilter[];
  onFiltersChange: (filters: LinearFilter[]) => void;
  className?: string;
  /** Optional leading content (e.g. search input) */
  leading?: React.ReactNode;
};

export function LinearFilters({
  types,
  filters,
  onFiltersChange,
  className,
  leading,
}: LinearFiltersProps) {
  const typeMap = React.useMemo(
    () => new Map(types.map((t) => [t.type, t])),
    [types],
  );

  const activeFilters = filters.filter((f) => f.value.length > 0);
  const existingTypes = React.useMemo(
    () => new Set(activeFilters.map((f) => f.type)),
    [activeFilters],
  );

  const updateFilter = (id: string, patch: Partial<LinearFilter>) => {
    onFiltersChange(
      filters.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        const config = typeMap.get(next.type);
        const selection = config?.selection ?? "multi";
        next.operator = resolveOperator(selection, next.value);
        return next;
      }),
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const clearFilters = () => onFiltersChange([]);

  const handleAdd = (type: string, firstValue: string) => {
    const config = typeMap.get(type);
    if (!config) return;
    const selection = config.selection ?? "multi";
    onFiltersChange([
      ...filters.filter((f) => f.type !== type),
      {
        id: newFilterId(),
        type,
        value: [firstValue],
        operator: resolveOperator(selection, [firstValue]),
      },
    ]);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border/30 px-6 py-3",
        className,
      )}
    >
      <Filter className="size-3.5 shrink-0 text-muted-foreground" />
      {leading}
      <div className="flex flex-wrap items-center gap-2">
        {activeFilters.map((filter) => {
          const config = typeMap.get(filter.type);
          if (!config) return null;
          const selection = config.selection ?? "multi";
          const operators: LinearFilterOperator[] =
            selection === "single"
              ? ["is"]
              : filter.value.length > 1
                ? ["is any of"]
                : ["is", "is any of"];

          return (
            <div
              key={filter.id}
              className="flex items-center gap-px text-xs"
            >
              <div className="flex shrink-0 items-center gap-1.5 rounded-l bg-muted px-1.5 py-1">
                {config.icon}
                <span>{config.label}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="shrink-0 bg-muted px-1.5 py-1 text-muted-foreground transition hover:bg-muted/50 hover:text-primary">
                  {filter.operator}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-fit w-fit">
                  {operators.map((op) => (
                    <DropdownMenuItem
                      key={op}
                      onClick={() => updateFilter(filter.id, { operator: op })}
                    >
                      {op}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FilterValueCombobox
                config={config}
                filterValues={filter.value}
                setFilterValues={(values) => {
                  if (values.length === 0) {
                    removeFilter(filter.id);
                    return;
                  }
                  updateFilter(filter.id, { value: values });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFilter(filter.id)}
                className="h-6 w-6 shrink-0 rounded-l-none rounded-r-sm bg-muted text-muted-foreground transition hover:bg-muted/50 hover:text-primary"
              >
                <X className="size-3" />
              </Button>
            </div>
          );
        })}

        <AddFilterButton
          types={types}
          existingTypes={existingTypes}
          onAdd={handleAdd}
        />

        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
