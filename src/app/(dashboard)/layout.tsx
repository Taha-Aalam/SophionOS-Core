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
import { getSubscriptionSummary } from "@/lib/api/subscription-summary";
import { resolveUserProfile } from "@/lib/notifications/resolve-email";

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
  const { userId, redirectToSignIn } = await auth();

  // Resource-based auth: this replaces the proxy's deprecated path-based
  // auth.protect(). Anonymous dashboard requests bounce here. Same machinery
  // the middleware used (createRedirect): 307 /login?redirect_url=<current url>.
  if (!userId) return redirectToSignIn();

  // Gate the shell behind onboarding completion BEFORE rendering. Incomplete
  // users are redirected server-side, so they never see the dashboard flash
  // then bounce on the client.
  const supabase = await createClient();
  const onboarding = await userSettingsService.getOnboardingState(userId, { supabase });
  const destination = await resolveDashboardDestination(onboarding);
  if (destination) redirect(destination);
  // Resolve the full profile + subscription server-side so the topbar renders
  // name/email/avatar and the cohort badge in the FIRST paint — no icon-only
  // flash, no regression to "User" while Clerk's client SDK loads (AuthProvider
  // falls back to this seed). One Clerk backend call shared by both; the
  // summary caches for 60s so client-side navigations don't re-hit Clerk or
  // the marketing site. Total added latency: one Clerk call (profile), which
  // the page already pays on every dynamic render.
  const profile = await resolveUserProfile(userId).catch(() => null);
  const initialUser = {
    id: userId,
    email: profile?.email ?? null,
    name: profile?.name ?? null,
    imageUrl: profile?.imageUrl ?? null,
  };
  const initialSubscription = await getSubscriptionSummary(userId, { profile });
  return (
    <AuthProvider initialUser={initialUser}>
      <InboxBackfillProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileNav />
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <Topbar initialSubscription={initialSubscription} />
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