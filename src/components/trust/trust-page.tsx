import type { ComponentType } from "react";
import type { ReactNode } from "react";

/**
 * Shared wrapper for the system policy pages (/terms, /privacy, /security,
 * /subprocessors, /data-and-ai, /responsible-disclosure).
 *
 * The heading block mirrors the app's list pages (see areas-content.tsx) —
 * same icon slot, same rhythm. The frame is a single measured column: heading
 * and body share one edge, so a long legal document reads as an article
 * instead of a broken page with a dead right gutter.
 *
 * Long-form element styling lives in the `.legal-doc` block in globals.css —
 * Tailwind Typography is NOT installed, so the old `prose` classes were inert.
 *
 * No "use client": these pages are Server Components.
 */
export function TrustPage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string; size?: number; "aria-hidden"?: "true" | "false" | undefined }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="content-fade-in reveal-stagger mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Icon size={24} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        {/* min-w-0: a flex child's floor is its longest word, so without it a
            long title pushes the column past max-w-3xl and the centred frame
            leans left (28px dead right gutter at 1280px). */}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight font-heading">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
      </div>
      <div className="legal-doc">{children}</div>
    </div>
  );
}
