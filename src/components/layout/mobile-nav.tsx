"use client";

import React, { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Settings, SunMoon } from "lucide-react";

import { coreNavItems, systemNavItems } from "@/components/layout/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isActiveNavigationPath } from "@/lib/auth/auth-routing";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

function MobileNavLink({
  href,
  label,
  icon: Icon,
  onClick,
  comingSoon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const pathname = usePathname();
  const isActive = isActiveNavigationPath(pathname, href);

  return (
    <Link
      href={comingSoon ? "#" : href}
      onClick={(event) => {
        if (comingSoon) {
          event.preventDefault();
          return;
        }

        onClick?.();
      }}
      className={cn(
        "group/mnav relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-[var(--ease-out-quint)]",
        isActive && !comingSoon
          ? "bg-accent text-accent-foreground"
          : comingSoon
            ? "cursor-not-allowed text-muted-foreground opacity-60"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {isActive && !comingSoon ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />
      ) : null}
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const { closeSidebar, isMobileNavOpen } = useUIStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  const displayName = user?.name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const themeLabel = mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "Theme";

  return (
    <Sheet open={isMobileNavOpen} onOpenChange={(open) => !open && closeSidebar()}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="flex h-12 shrink-0 flex-row items-center justify-between border-b border-border px-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-[0_2px_8px_oklch(0.3_0.15_260/0.35)]">
              S
            </div>
            SophionOS
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Core
            </p>
            {coreNavItems.map((item) => (
              <MobileNavLink key={item.href} {...item} onClick={closeSidebar} />
            ))}
          </div>

          <div className="space-y-0.5">
            <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              System
            </p>
            {systemNavItems.map((item) => (
              <MobileNavLink key={item.href} {...item} onClick={closeSidebar} />
            ))}
          </div>

        </nav>

        <div className="space-y-1 border-t border-border px-3 py-4">
          <Link
            href="/settings"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="size-4 shrink-0" />
            <span>Settings</span>
          </Link>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              closeSidebar();
            }}
          >
            <SunMoon className="size-4 shrink-0" />
            <span>{themeLabel}</span>
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <span className="text-destructive">Sign out</span>
          </Button>
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{displayName}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
