"use client";

import { ChevronDownIcon, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESOURCE_TYPE } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
const filterOptionClassName =
  "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

interface FilterItem {
  id: string;
  name: string;
  icon?: string | null;
}

interface ResourcesFilterBarProps {
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterAreaIds: string[];
  onFilterAreaIdsChange: (ids: string[]) => void;
  filterGoalIds: string[];
  onFilterGoalIdsChange: (ids: string[]) => void;
  filterTaskIds: string[];
  onFilterTaskIdsChange: (ids: string[]) => void;
  filterTopicIds: string[];
  onFilterTopicIdsChange: (ids: string[]) => void;
  areaPopoverOpen: boolean;
  onAreaPopoverOpenChange: (open: boolean) => void;
  goalPopoverOpen: boolean;
  onGoalPopoverOpenChange: (open: boolean) => void;
  taskPopoverOpen: boolean;
  onTaskPopoverOpenChange: (open: boolean) => void;
  topicPopoverOpen: boolean;
  onTopicPopoverOpenChange: (open: boolean) => void;
  activeAreas: FilterItem[];
  activeGoals: FilterItem[];
  activeTasks: FilterItem[];
  activeTopics: FilterItem[];
  selectedAreaLabels: string[];
  selectedGoalLabels: string[];
  selectedTaskLabels: string[];
  selectedTopicLabels: string[];
  hasFilters: boolean;
  onClearFilters: () => void;
}

function FilterPopover({
  open,
  onOpenChange,
  label,
  selectedIds,
  selectedLabels,
  items,
  onToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  selectedIds: string[];
  selectedLabels: string[];
  items: FilterItem[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
        )}
      >
        {selectedIds.length === 0 ? (
          label
        ) : (
          <span className="flex items-center gap-1">
            <span className="max-w-[100px] truncate">{selectedLabels[0]}</span>
            {selectedLabels.length > 1 && (
              <Badge variant="secondary" className="h-4 px-1 text-2xs">
                +{selectedLabels.length - 1}
              </Badge>
            )}
          </span>
        )}
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className={filterPopoverContentClassName}>
        <div className="space-y-1">
          {items.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">No {label.toLowerCase()}s available.</p>
          )}
          <ScrollArea className="max-h-60 w-full">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <label key={item.id} className={filterOptionClassName}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      onToggle(item.id, next === true);
                    }}
                  />
                  <span className={filterOptionLabelClassName}>
                    {item.icon ? `${item.icon} ` : ""}
                    {item.name}
                  </span>
                </label>
              );
            })}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ResourcesFilterBar({
  filterType,
  onFilterTypeChange,
  filterAreaIds,
  onFilterAreaIdsChange,
  filterGoalIds,
  onFilterGoalIdsChange,
  filterTaskIds,
  onFilterTaskIdsChange,
  filterTopicIds,
  onFilterTopicIdsChange,
  areaPopoverOpen,
  onAreaPopoverOpenChange,
  goalPopoverOpen,
  onGoalPopoverOpenChange,
  taskPopoverOpen,
  onTaskPopoverOpenChange,
  topicPopoverOpen,
  onTopicPopoverOpenChange,
  activeAreas,
  activeGoals,
  activeTasks,
  activeTopics,
  selectedAreaLabels,
  selectedGoalLabels,
  selectedTaskLabels,
  selectedTopicLabels,
  hasFilters,
  onClearFilters,
}: ResourcesFilterBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
      <Filter className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterType || "__all_type__"}
          onValueChange={(value) =>
            onFilterTypeChange(value === "__all_type__" ? "" : (value ?? ""))
          }
        >
          <SelectTrigger className="h-10 sm:h-8 w-[140px] sm:w-48 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all_type__">All types</SelectItem>
            <SelectItem value={RESOURCE_TYPE.WEBSITE}>Website</SelectItem>
            <SelectItem value={RESOURCE_TYPE.ARTICLE}>Article</SelectItem>
            <SelectItem value={RESOURCE_TYPE.VIDEO}>Video</SelectItem>
            <SelectItem value={RESOURCE_TYPE.DOCUMENT}>Document</SelectItem>
            <SelectItem value={RESOURCE_TYPE.PODCAST}>Podcast</SelectItem>
            <SelectItem value={RESOURCE_TYPE.SOCIAL_MEDIA}>Social Media</SelectItem>
            <SelectItem value={RESOURCE_TYPE.TOOL}>Tool</SelectItem>
          </SelectContent>
        </Select>

        <FilterPopover
          open={areaPopoverOpen}
          onOpenChange={onAreaPopoverOpenChange}
          label="Area"
          selectedIds={filterAreaIds}
          selectedLabels={selectedAreaLabels}
          items={activeAreas}
          onToggle={(id, checked) =>
            onFilterAreaIdsChange(
              checked
                ? Array.from(new Set([...filterAreaIds, id]))
                : filterAreaIds.filter((fid) => fid !== id),
            )
          }
        />

        <FilterPopover
          open={goalPopoverOpen}
          onOpenChange={onGoalPopoverOpenChange}
          label="Goal"
          selectedIds={filterGoalIds}
          selectedLabels={selectedGoalLabels}
          items={activeGoals}
          onToggle={(id, checked) =>
            onFilterGoalIdsChange(
              checked
                ? Array.from(new Set([...filterGoalIds, id]))
                : filterGoalIds.filter((fid) => fid !== id),
            )
          }
        />

        <FilterPopover
          open={taskPopoverOpen}
          onOpenChange={onTaskPopoverOpenChange}
          label="Task"
          selectedIds={filterTaskIds}
          selectedLabels={selectedTaskLabels}
          items={activeTasks}
          onToggle={(id, checked) =>
            onFilterTaskIdsChange(
              checked
                ? Array.from(new Set([...filterTaskIds, id]))
                : filterTaskIds.filter((fid) => fid !== id),
            )
          }
        />

        <FilterPopover
          open={topicPopoverOpen}
          onOpenChange={onTopicPopoverOpenChange}
          label="Topic"
          selectedIds={filterTopicIds}
          selectedLabels={selectedTopicLabels}
          items={activeTopics}
          onToggle={(id, checked) =>
            onFilterTopicIdsChange(
              checked
                ? Array.from(new Set([...filterTopicIds, id]))
                : filterTopicIds.filter((fid) => fid !== id),
            )
          }
        />

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
