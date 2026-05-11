"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu as MenuIcon, Settings, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { breadcrumbLabels } from "@/components/layout/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/lib/stores/ui.store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (value: string) => UUID_RE.test(value);

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { pageTitle } = useUIStore();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const baseLabel = breadcrumbLabels[segment] ?? segment;
        let label: React.ReactNode = baseLabel;

        if (isUUID(segment)) {
          label = pageTitle || "Details";
        }

        // For /goals/<slug> — use page title set by detail page, fallback to raw slug while loading
        const isGoalsSlugSegment =
          segments[0] === "goals" && index === 1 && !isUUID(segment);
        if (isGoalsSlugSegment) {
          label = pageTitle || segment;
        }

        // For /projects/<slug-or-uuid> — prefer current page title
        if (segments[0] === "projects" && index === 1 && pageTitle) {
          label = pageTitle;
        }

        // For /notes/<slug-or-uuid> — use page title set by detail page, fallback to raw slug while loading
        const isNotesSegment = segments[0] === "notes" && index === 1;
        if (isNotesSegment) {
          label = pageTitle || segment;
        }

        return (
          <React.Fragment key={href}>
            {!isLast ? (
              <>
                <span className="capitalize text-muted-foreground">{label}</span>
                <span className="text-muted-foreground">/</span>
              </>
            ) : (
              <span className="capitalize font-medium">{label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function Topbar() {
  const router = useRouter();
  const { openMobileNav } = useUIStore();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const displayName = user?.user_metadata?.name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileNav}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-4" />
        </button>
        <Breadcrumb />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="User menu"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate sm:block">{displayName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{user?.email || "Signed in"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <SunMoon className="mr-2 size-4" />
              {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} variant="destructive">
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
