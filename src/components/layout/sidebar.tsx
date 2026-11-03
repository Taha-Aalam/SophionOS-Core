"use client";

import React, { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRightIcon } from "lucide-react";

import { SettingsIcon, SunMoonIcon } from "@/components/icons";

import {
  coreNavItems,
  isPolicyPath,
  systemNavItems,
  trustNavItems,
} from "@/components/layout/navigation";
import { UserAvatar, useUserIdentity } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const link = (
    <Link
      href={comingSoon ? "#" : href}
      onClick={(event) => {
        if (comingSoon) {
          event.preventDefault();
        }
      }}
      className={cn(
        "group/nav relative flex items-center transition-colors duration-150 ease-[var(--ease-out-quint)]",
        showLabel
          ? "gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium"
          : "size-10 justify-center rounded-lg mx-auto",
        isActive && !comingSoon
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]"
          : comingSoon
            ? "cursor-not-allowed text-muted-foreground opacity-60"
            : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
      aria-label={showLabel ? undefined : label}
    >
      {isActive && !comingSoon ? (
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full bg-primary",
            showLabel
              ? "left-0 top-1/2 h-4 w-0.5 -translate-y-1/2"
              : "left-1 top-1/2 h-5 w-1 -translate-y-1/2",
          )}
        />
      ) : null}
      <Icon size={showLabel ? 16 : 19} className="shrink-0" />
      {showLabel ? <span>{label}</span> : null}
    </Link>
  );

  if (!showLabel) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { isDesktopSidebarOpen, toggleDesktopSidebar } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  // On a policy page the sidebar stops being app navigation: Core/System and
  // the account footer (Settings, Theme, profile) are replaced by the Policies
  // list alone. Policy documents should read as documents, not as the app.
  const policyMode = isPolicyPath(pathname);

  // Same identity source as the topbar — see useUserIdentity.
  const { displayName } = useUserIdentity();
  const themeLabel = mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "Theme";

  return (
    <aside
      className={cn(
        // `group/sidebar` drives the collapsed rail's hover-revealed expand
        // bubble; `relative z-20` lets that bubble overflow the rail's right
        // edge and still paint above the content column.
        "group/sidebar relative z-20 hidden h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        isDesktopSidebarOpen ? "w-64" : "w-20",
      )}
    >
      <TooltipProvider delay={100}>
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b border-sidebar-border",
          // Collapsed: the logo is the only child left, and every other rail
          // item is centred — so centre it too. The expand control moved out
          // of this row entirely (it floats over the rail's right edge).
          isDesktopSidebarOpen ? "justify-between px-3" : "justify-center px-2.5",
        )}
      >
        {isDesktopSidebarOpen ? (
          <Link href={policyMode ? "/" : "/dashboard"} className="group flex items-center gap-2 text-sm font-semibold">
            <Image
              src="/brand/sophion-symbol.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="size-6 dark:hidden"
            />
            <Image
              src="/brand/sophion-symbol-reversed-white.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="hidden size-6 dark:block"
            />
            <span className="tracking-tight">SophionOS</span>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={policyMode ? "/" : "/dashboard"}
                  className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent/70 transition-colors"
                  aria-label="SophionOS"
                >
                  <Image
                    src="/brand/sophion-symbol.svg"
                    alt="SophionOS"
                    width={26}
                    height={26}
                    unoptimized
                    className="size-[26px] dark:hidden"
                  />
                  <Image
                    src="/brand/sophion-symbol-reversed-white.svg"
                    alt="SophionOS"
                    width={26}
                    height={26}
                    unoptimized
                    className="hidden size-[26px] dark:block"
                  />
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={10}>
              SophionOS
            </TooltipContent>
          </Tooltip>
        )}
        {isDesktopSidebarOpen ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleDesktopSidebar}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Collapsed-rail expand affordance: a circular bubble straddling the
          rail's right edge at logo height. It is absolutely positioned, so it
          takes no space in the rail's layout flow and no rail item shifts to
          make room for it. It stays mounted and focusable at all times — it is
          only *invisible* until the rail is hovered or the button is focused,
          which keeps the affordance discoverable without adding visual noise
          to the resting rail. Touch devices have no hover, so there it rests at
          reduced opacity instead of disappearing. */}
      {!isDesktopSidebarOpen ? (
        <div className="absolute right-0 top-6 z-10 -translate-y-1/2 translate-x-1/2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={toggleDesktopSidebar}
                  aria-label="Expand sidebar"
                  className={cn(
                    "size-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    // Resting: invisible and nudged toward the rail. Revealed
                    // by rail hover, keyboard focus, or pointer focus.
                    "opacity-0 -translate-x-1",
                    "group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100",
                    "focus:translate-x-0 focus:opacity-100",
                    "focus-visible:translate-x-0 focus-visible:opacity-100",
                    // No hover available: keep the affordance visible (dimmer).
                    "pointer-coarse:opacity-70",
                  )}
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="right" sideOffset={10}>
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <nav className={cn("flex-1 overflow-y-auto px-2 py-3", isDesktopSidebarOpen ? "space-y-5" : "space-y-4")}>
        {policyMode ? (
          <div className={isDesktopSidebarOpen ? "space-y-0.5" : "space-y-2"}>
            {isDesktopSidebarOpen ? (
              <p className="mb-1 px-2.5 text-2xs font-medium text-muted-foreground">
                Policies
              </p>
            ) : null}
            {trustNavItems.map((item) => (
              <NavLink key={item.href} {...item} showLabel={isDesktopSidebarOpen} />
            ))}
          </div>
        ) : (
          <>
            <div className={isDesktopSidebarOpen ? "space-y-0.5" : "space-y-2"}>
              {isDesktopSidebarOpen ? (
                <p className="mb-1 px-2.5 text-2xs font-medium text-muted-foreground">
                  Core
                </p>
              ) : null}
              {coreNavItems.map((item) => (
                <NavLink key={item.href} {...item} showLabel={isDesktopSidebarOpen} />
              ))}
            </div>

            <div className={isDesktopSidebarOpen ? "space-y-0.5" : "space-y-2"}>
              {isDesktopSidebarOpen ? (
                <p className="mb-1 px-2.5 text-2xs font-medium text-muted-foreground">
                  System
                </p>
              ) : null}
              {systemNavItems.map((item) => (
                <NavLink key={item.href} {...item} showLabel={isDesktopSidebarOpen} />
              ))}
            </div>
          </>
        )}
      </nav>

      {policyMode ? null : (
        <div
          className={cn(
            "border-t border-sidebar-border px-2 py-3",
            isDesktopSidebarOpen ? "space-y-1" : "space-y-2",
          )}
        >
          <NavLink
            href="/settings"
            label="Settings"
            icon={SettingsIcon}
            showLabel={isDesktopSidebarOpen}
          />
          {isDesktopSidebarOpen ? (
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <SunMoonIcon size={16} className="shrink-0" />
              <span>{themeLabel}</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    // `flex` (not the Button's default `inline-flex`): an
                    // inline-level box ignores `mx-auto`, which is why this
                    // toggle used to sit flush left instead of centred in the
                    // rail like every other item.
                    className="flex size-10 mx-auto justify-center rounded-lg p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    aria-label={themeLabel}
                  >
                    <SunMoonIcon size={19} className="shrink-0" />
                  </Button>
                }
              />
              <TooltipContent side="right" sideOffset={10}>
                {themeLabel}
              </TooltipContent>
            </Tooltip>
          )}
          {isDesktopSidebarOpen ? (
            <Link
              href="/settings/profile"
              aria-label={`Open profile: ${displayName}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <UserAvatar size="sm" />
              <span className="truncate text-sm font-medium">{displayName}</span>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/settings/profile"
                    aria-label={`Open profile: ${displayName}`}
                    className="flex size-10 mx-auto items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <UserAvatar size="sm" />
                  </Link>
                }
              />
              <TooltipContent side="right" sideOffset={10}>
                Profile: {displayName}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      </TooltipProvider>
    </aside>
  );
}
