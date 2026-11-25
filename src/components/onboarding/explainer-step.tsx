"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import type { OnboardingStepMeta } from "@/lib/onboarding/steps";

/**
 * Value-explainer step for notes/resources/contacts. These are not mandatory
 * CRUD walls — they set expectations and let the user move on. The title/icon
 * already render in StepShell, so this just adds a short reassurance line.
 */
export function ExplainerStep({ meta }: { meta: OnboardingStepMeta }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {t("explainerStep.youaposllFind")} <span className="font-medium text-foreground">{meta.title.replace(/^.*? /, "")}</span>{" "}
        {t("explainerStep.inTheSidebarOnceYouaposreInNothingToSetUpN")}
      </p>
    </div>
  );
}
