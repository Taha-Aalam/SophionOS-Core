import React from "react";
import { auth } from "@clerk/nextjs/server";
import { AuthProvider } from "@/components/providers/auth-provider";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding sits outside the (dashboard) group, so it wires its own
  // AuthProvider. That gives the client wizard `useAuth()` and runs the same
  // idempotent seed/provision bootstrap (seedDefaultAreas + provisionSubscription)
  // the dashboard relies on — the areas step confirms those seeded defaults.
  const { userId } = await auth();
  const initialUser = userId
    ? { id: userId, email: null, name: null, imageUrl: null }
    : null;

  return (
    <AuthProvider initialUser={initialUser}>
      <div className="min-h-screen bg-background">{children}</div>
    </AuthProvider>
  );
}
