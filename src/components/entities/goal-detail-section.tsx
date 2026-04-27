"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: Record<string, string> = {
  projects: "bg-blue-500",
  tasks: "bg-green-500",
  notes: "bg-purple-500",
  resources: "bg-orange-500",
};

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  projects: FileText,
  tasks: FileText,
  notes: FileText,
  resources: FileText,
};

interface TabOption {
  value: string;
  label: string;
  count?: number;
}

interface GoalDetailSectionProps {
  id: string;
  entityType: "projects" | "tasks" | "notes" | "resources";
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLoading: boolean;
  children: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onCreateNew?: () => void;
  createLabel?: string;
}

export function GoalDetailSection({
  id,
  entityType,
  tabs,
  activeTab,
  onTabChange,
  isLoading,
  children,
  emptyTitle,
  emptyDescription,
  onCreateNew,
  createLabel = "New",
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
        <h2 className="text-lg font-semibold capitalize">{entityType}</h2>
        {tabs.find((t) => t.value === activeTab)?.count !== undefined && (
          <span className="text-sm text-muted-foreground">
            {tabCountMap.get(activeTab) ?? 0} total
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({tab.count})
                </span>
              )}
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