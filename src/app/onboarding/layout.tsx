import React from "react";
import { auth } from "@clerk/nextjs/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding sits outside the (dashboard) group, so it wires its own
  // AuthProvider. That gives the client wizard `useAuth()` and runs the same
  // once-per-account seed/provision bootstrap (seedDefaultAreas +
  // provisionSubscription) the dashboard relies on — the areas step confirms
  // those seeded defaults. The seed half is gated server-side on the
  // account's areas_seeded_at marker: a set marker means initialization
  // already completed and the bootstrap must issue no seed work at all.

  // Resource-based auth: pre-migration the proxy bounced anonymous
  // /onboarding requests with auth.protect(); the gate now lives here. Same
  // createRedirect machinery -> 307 /login?redirect_url=<current url>.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const supabase = await createClient();
  const { areasSeededAt } = await userSettingsService.getOnboardingRow(userId, { supabase });

  const initialUser = { id: userId, email: null, name: null, imageUrl: null };

  return (
    <AuthProvider initialUser={initialUser} initialAreasSeededAt={areasSeededAt}>
      <div className="min-h-screen bg-background">{children}</div>
    </AuthProvider>
  );
}
