import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { resolveOnboardingDestination } from "@/lib/onboarding/onboarding-routing";
import { createClient } from "@/lib/supabase/server";
import { OnboardingContent } from "./onboarding-content";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // Mirror guard: users who already finished onboarding never see the wizard.
  const supabase = await createClient();
  const onboarding = await userSettingsService.getOnboardingState(userId, { supabase });
  const destination = await resolveOnboardingDestination(onboarding);
  if (destination) redirect(destination);

  return <OnboardingContent initialState={onboarding} />;
}
