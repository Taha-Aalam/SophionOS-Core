"use client";

import React from "react";

import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

/**
 * Root frame for the desktop app shell. Publishes the sidebar state as
 * `data-sidebar-state` on the frame element so every standard content column
 * (`.content-column-grid` in globals.css) widens by the sidebar width delta
 * when the rail is collapsed — without any page knowing the sidebar exists.
 *
 * Server-rendered children pass straight through, and the store's default is
 * `true` (expanded, never persisted), so SSR and the first client render agree.
 *
 * `forceExpanded` pins the frame to the expanded cap when no sidebar is on
 * screen (the signed-out trust pages render the same desktop branch without
 * the rail, so granting a width delta would be meaningless there).
 */
export function ShellFrame({
  className,
  forceExpanded = false,
  children,
}: {
  className?: string;
  forceExpanded?: boolean;
  children: React.ReactNode;
}) {
  const isDesktopSidebarOpen = useUIStore((s) => s.isDesktopSidebarOpen);
  const collapsed = !forceExpanded && !isDesktopSidebarOpen;
  return (
    <div
      className={cn(className)}
      data-sidebar-state={collapsed ? "collapsed" : "expanded"}
    >
      {children}
    </div>
  );
}
