"use client";

import React, { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Settings, SunMoon } from "lucide-react";

import { coreNavItems, systemNavItems } from "@/components/layout/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isActiveNavigationPath } from "@/lib/auth/auth-routing";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  icon: Icon,
  comingSoon,
  showLabel,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  comingSoon?: boolean;
  showLabel: boolean;
}) {
  const pathname = usePathname();
  const isActive = isActiveNavigationPath(pathname, href);

  return (
    <Link
      href={comingSoon ? "#" : href}
      onClick={(event) => {
        if (comingSoon) {
          event.preventDefault();
        }
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        isActive && !comingSoon
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : comingSoon
            ? "cursor-not-allowed text-muted-foreground opacity-60"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
      title={showLabel ? undefined : label}
    >
      <Icon className="size-4 shrink-0" />
      {showLabel ? <span>{label}</span> : null}
    </Link>
  );
}

export function Sidebar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const { isDesktopSidebarOpen, toggleDesktopSidebar } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  const displayName = user?.user_metadata?.name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const themeLabel = mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "Theme";

  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        isDesktopSidebarOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            L
          </div>
          {isDesktopSidebarOpen ? <span>LifeOS</span> : null}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleDesktopSidebar}
          aria-label={isDesktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isDesktopSidebarOpen ? (
            <ChevronLeft className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {isDesktopSidebarOpen ? (
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Core
            </p>
          ) : null}
          {coreNavItems.map((item) => (
            <NavLink key={item.href} {...item} showLabel={isDesktopSidebarOpen} />
          ))}
        </div>

        <div className="space-y-0.5">
          {isDesktopSidebarOpen ? (
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              System
            </p>
          ) : null}
          {systemNavItems.map((item) => (
            <NavLink key={item.href} {...item} showLabel={isDesktopSidebarOpen} />
          ))}
        </div>
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-2 py-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4 shrink-0" />
          {isDesktopSidebarOpen ? <span>Settings</span> : null}
        </Link>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <SunMoon className="size-4 shrink-0" />
          {isDesktopSidebarOpen ? <span>{themeLabel}</span> : null}
        </Button>
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {isDesktopSidebarOpen ? (
            <span className="truncate text-sm font-medium">{displayName}</span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
