"use client";

import React, { useMemo } from "react";
import { FileText, Link as LinkIcon, LucideIcon, Plus } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: Record<string, string> = {
  goals: "bg-blue-500",
  projects: "bg-blue-500",
  tasks: "bg-green-500",
  notes: "bg-purple-500",
  resources: "bg-orange-500",
  people: "bg-sky-500",
};

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  goals: FileText,
  projects: FileText,
  tasks: FileText,
  notes: FileText,
  resources: FileText,
  people: FileText,
};

interface TabOption {
  value: string;
  label: string;
  count?: number;
}

interface GoalDetailSectionProps {
  id: string;
  entityType: "goals" | "projects" | "tasks" | "notes" | "resources" | "people";
  /** Optional heading override. Defaults to the capitalized entityType. */
  heading?: string;
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLoading: boolean;
  children: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onCreateNew?: () => void;
  createLabel?: string;
  onLinkExisting?: () => void;
  linkLabel?: string;
}

export function GoalDetailSection({
  id,
  entityType,
  heading,
  tabs,
  activeTab,
  onTabChange,
  isLoading,
  children,
  emptyTitle,
  emptyDescription,
  onCreateNew,
  createLabel = "New",
  onLinkExisting,
  linkLabel = "Link Existing",
}: GoalDetailSectionProps) {
  const accentColor = ACCENT_COLORS[entityType] ?? "bg-primary";

  const tabCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tab of tabs) {
      if (tab.count !== undefined) {
        map.set(tab.value, tab.count);
      }
    }
    return map;
  }, [tabs]);

  return (
    <section id={id} className="scroll-mt-20">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("h-5 w-1 rounded-full", accentColor.replace("bg-", "bg-"))} />
        <h2 className="text-lg font-semibold font-heading capitalize">{heading ?? entityType}</h2>
        {tabs.find((t) => t.value === activeTab)?.count !== undefined && (
          <span className="text-sm text-muted-foreground">
            {tabCountMap.get(activeTab) ?? 0} total
          </span>
        )}
        {onLinkExisting && (
          <Button
            size="sm"
            variant="outline"
            onClick={onLinkExisting}
            className="ml-auto gap-1.5"
          >
            <LinkIcon className="size-3.5" />
            {linkLabel}
          </Button>
        )}
        {onCreateNew && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateNew}
            className={cn("gap-1.5", !onLinkExisting && "ml-auto")}
          >
            <Plus className="size-3.5" />
            {createLabel}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="h-9 w-full flex-nowrap justify-start overflow-x-auto overflow-y-hidden bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1023px]:[scrollbar-width:thin] max-[1023px]:[&::-webkit-scrollbar]:block">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : children ? (
            children
          ) : (
            <EmptyState
              icon={DEFAULT_ICONS[entityType] ?? FileText}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={onCreateNew ? createLabel : undefined}
              onAction={onCreateNew}
            />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
