"use client";

import * as React from "react";
import { CreditCard, FileText, KeyRound, LogOut, Plug, Settings, SunMoon, User } from "lucide-react";

import { CohortMemberBadge } from "@/components/settings/cohort-member-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/lib/hooks/use-subscription";
import type { SubscriptionSummary } from "@/lib/api/subscription-summary";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  lifetime: "Lifetime",
  max: "Max",
};

interface MenuItem {
  label: string;
  value?: string;
  valueTone?: "blue" | "purple";
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}
/**
 * Topbar profile button + dropdown, per docs/stitch/top-bar-profile: a wide
 * pill trigger showing name/email on the left and the gradient-ring avatar on
 * the right, with a bending indicator line outside its right edge. Menu items
 * are cards with a trailing value chip (Cohort / tier). Sign Out sits below a
 * gradient separator in a red wash.
 */
export function ProfileDropdown({
  className,
  initialSubscription,
}: {
  className?: string;
  initialSubscription?: SubscriptionSummary | null;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const { data: liveSubscription } = useSubscription();
  const { resolvedTheme, setTheme } = useTheme();
  // Live client data (session-cached by useSubscription) wins once known; the
  // server seed is only the first-paint fallback. Seed-first would pin a
  // stale seed — e.g. one computed during a marketing-site blip — for the
  // whole session even after the client fetch resolves correctly.
  const subscription = liveSubscription ?? initialSubscription;

  // Title-case every word: Clerk may return lowercase usernames/emails, and a
  // raw fallback value must still read as a proper name.
  const rawName = user?.name || user?.email || "User";
  const displayName = rawName.replace(/\b([\p{L}])/gu, (ch) => ch.toUpperCase());
  const email = user?.email ?? "";
  const avatarUrl = user?.imageUrl || undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  const tierLabel = subscription ? (TIER_LABELS[subscription.tier] ?? subscription.tier) : undefined;
  const billingEnabled = isFeatureEnabled("sop_cloud");

  const menuItems: MenuItem[] = [
    {
      label: "Profile",
      href: "/settings/profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      label: "Subscription",
      value: billingEnabled ? (tierLabel ?? "Free") : undefined,
      valueTone: "purple",
      href: billingEnabled ? "/settings/billing" : "/settings",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      label: "API Keys",
      href: "/settings/api-keys",
      icon: <KeyRound className="h-4 w-4" />,
    },
    {
      label: "MCP Server",
      href: "/settings/mcp",
      icon: <Plug className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      label: "Terms & Policies",
      href: "/terms",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu onOpenChange={setIsOpen}>
        <div className="group relative">
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="User menu"
                className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent/60"
              >
                <div className="flex min-w-0 flex-col items-start text-left leading-tight">
                  <span className="flex max-w-[16rem] items-center gap-1.5">
                    <span className="truncate text-sm font-medium tracking-tight text-foreground">
                      {displayName}
                    </span>
                    <CohortMemberBadge variant="pill" seed={initialSubscription} />
                  </span>
                  {email ? (
                    <span className="max-w-[16rem] truncate text-xs tracking-tight text-muted-foreground">
                      {email}
                    </span>
                  ) : null}
                </div>
                <span className="relative block size-9 shrink-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
                  <Avatar className="size-full" size="default">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                    <AvatarFallback className="rounded-full bg-background text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </button>
            }
          />

          {/* Bending line indicator on the right (stitch spec) */}
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 transition-all duration-200",
              "right-0 translate-x-full",
              isOpen ? "opacity-100" : "opacity-60 group-hover:opacity-100",
            )}
            aria-hidden
          >
            <svg
              width="12"
              height="24"
              viewBox="0 0 12 24"
              fill="none"
              className={cn(
                "transition-all duration-200",
                isOpen
                  ? "scale-110 text-blue-500 dark:text-blue-400"
                  : "text-muted-foreground/60 group-hover:text-muted-foreground",
              )}
            >
              <path
                d="M2 4C6 8 6 16 2 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-64 rounded-2xl p-2"
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  className="rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-border/60 hover:bg-accent/70 hover:shadow-sm"
                  render={
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                    />
                  }
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {item.icon}
                    <span className="whitespace-nowrap text-sm font-medium leading-tight tracking-tight">
                      {item.label}
                    </span>
                  </div>
                  {item.value ? (
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded-md border px-2 py-1 text-xs font-medium tracking-tight",
                        item.valueTone === "blue"
                          ? "border-blue-500/10 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "border-purple-500/10 bg-purple-500/10 text-purple-600 dark:text-purple-400",
                      )}
                    >
                      {item.value}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </div>

            <DropdownMenuSeparator className="my-3" />

            <DropdownMenuItem
              variant="destructive"
              className="rounded-xl bg-destructive/10 p-3 hover:bg-destructive/20"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </DropdownMenuItem>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors outline-none hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <SunMoon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              </span>
            </button>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
}
