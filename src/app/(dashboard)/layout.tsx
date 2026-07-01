import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutOverlay } from "@/components/layout/sign-out-overlay";
import { AuthProvider } from "@/components/providers/auth-provider";
import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { resolveDashboardDestination } from "@/lib/onboarding/onboarding-routing";
import { createClient } from "@/lib/supabase/server";

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

  // Gate the shell behind onboarding completion BEFORE rendering. Incomplete
  // users are redirected server-side, so they never see the dashboard flash
  // then bounce on the client.
  if (userId) {
    const supabase = await createClient();
    const onboarding = await userSettingsService.getOnboardingState(userId, { supabase });
    const destination = await resolveDashboardDestination(onboarding);
    if (destination) redirect(destination);
  }

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