import React, { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutOverlay } from "@/components/layout/sign-out-overlay";
import { AuthProvider } from "@/components/providers/auth-provider";
import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-resolved id seeds AuthProvider so the first client paint already has
  // the correct `user.id` for query keys — no empty-dashboard-then-reload flash.
  // Safe here (unlike the root layout): this layout is scoped to (dashboard) and
  // is never rendered for /login, so sign-out's navigation away never re-runs
  // this `auth()` mid session-revoke.
  const { userId } = await auth();
  const initialUser = userId
    ? { id: userId, email: null, name: null, imageUrl: null }
    : null;

  return (
    <AuthProvider initialUser={initialUser}>
      <InboxBackfillProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileNav />
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
        <SignOutOverlay />
      </InboxBackfillProvider>
    </AuthProvider>
  );
}