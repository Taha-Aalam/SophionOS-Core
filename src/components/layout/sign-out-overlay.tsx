"use client";

import React from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";

/**
 * Sign-out transition overlay. Sits above the dashboard tree while Clerk is
 * mid-revoke (between `user` going null and the route changing to /login).
 * Without this, hooks with `enabled: !!user` re-render to empty state during
 * that window and the user perceives the data as "dropping" before the page
 * navigates.
 */
export function SignOutOverlay() {
  const { isSigningOut } = useAuth();
  if (!isSigningOut) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <p className="text-sm">Signing out…</p>
      </div>
    </div>
  );
}
