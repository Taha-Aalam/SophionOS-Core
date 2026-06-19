"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu as MenuIcon, Settings, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { breadcrumbLabels } from "@/components/layout/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

        // For /contacts/<slug-or-uuid> — use page title set by detail page
        const isContactsSegment = segments[0] === "contacts" && index === 1;
        if (isContactsSegment) {
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
  const displayName = user?.name || user?.email || "User";
  const email = user?.email ?? "";
  const avatarUrl = user?.imageUrl || undefined;
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
              className="group flex h-auto items-center gap-2 rounded-full p-0.5 pr-1 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
              aria-label="User menu"
            />
          }
        >
          <Avatar size="sm">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-popup-open:rotate-180"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 px-1.5 py-1.5">
                <Avatar size="default">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  {email ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {email}
                    </span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 size-4 opacity-60" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <SunMoon className="mr-2 size-4 opacity-60" />
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
