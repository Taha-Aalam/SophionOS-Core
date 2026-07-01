"use client";

import type { OnboardingState } from "@/lib/services/user-settings.service";

/**
 * Placeholder onboarding shell. Task 3 replaces this with the multi-step
 * wizard (areas → goal → project → tasks → explainers). The route guard and
 * server plumbing (Task 2) are wired around it already.
 */
export function OnboardingContent({
  initialState,
}: {
  initialState: OnboardingState;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Welcome to LifeOS</h1>
      <p className="text-muted-foreground">
        Let&apos;s set up your workspace. Current step:{" "}
        <span className="font-medium">{initialState.current_step}</span>.
      </p>
    </div>
  );
}
