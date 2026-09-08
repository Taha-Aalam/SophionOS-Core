"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";

import { breadcrumbLabels } from "@/components/layout/navigation";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import type { SubscriptionSummary } from "@/lib/api/subscription-summary";
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

export function Topbar({
  initialSubscription,
}: {
  initialSubscription?: SubscriptionSummary | null;
}) {
  const { openMobileNav } = useUIStore();

  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileNav}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-4" />
        </button>
        <Breadcrumb />
      </div>

      <ProfileDropdown className="mr-1" initialSubscription={initialSubscription} />
    </header>
  );
}
