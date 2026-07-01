import type { OnboardingState } from "@/lib/services/user-settings.service";

type OnboardingLike = Pick<OnboardingState, "completed"> | null | undefined;

/**
 * Where a user hitting the dashboard shell should go. Incomplete or missing
 * onboarding => send them to /onboarding. Completed => null (stay put).
 * Pure + server-safe so the (dashboard) layout can decide before rendering.
 */
export async function resolveDashboardDestination(
  onboarding: OnboardingLike,
): Promise<string | null> {
  return onboarding?.completed ? null : "/onboarding";
}

/**
 * Mirror guard for the /onboarding route. Completed users are bounced to the
 * dashboard; everyone else stays in the wizard.
 */
export async function resolveOnboardingDestination(
  onboarding: OnboardingLike,
): Promise<string | null> {
  return onboarding?.completed ? "/dashboard" : null;
}
