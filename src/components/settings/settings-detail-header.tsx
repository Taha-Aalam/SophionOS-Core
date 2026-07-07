"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
import { popReturnToHref } from "@/lib/utils/return-to";

interface SettingsDetailHeaderProps {
  title: string;
  description?: string;
  /** Fallback destination when no returnTo/chain is present. Defaults to /settings. */
  fallbackHref?: string;
}

/**
 * Shared shell for settings subpages (preferences, notifications, api-keys,
 * mcp, integrations). Mirrors the area detail page convention:
 *  - Breadcrumb row: Back arrow → /Settings → /<page>
 *  - Title block with description
 *
 * Also wires Escape → back for consistency with detail pages.
 */
export function SettingsDetailHeader({
  title,
  description,
  fallbackHref = "/settings",
}: SettingsDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = popReturnToHref(searchParams, fallbackHref);
  useEscapeBack(backHref);

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(backHref)}
          aria-label="Back to Settings"
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li><Link href="/settings">Settings</Link></li>
            <li>/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
      </div>

      {/* Title block */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight font-heading">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}