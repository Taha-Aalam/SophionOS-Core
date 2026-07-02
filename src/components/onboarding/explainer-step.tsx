"use client";

import type { OnboardingStepMeta } from "@/lib/onboarding/steps";

/**
 * Value-explainer step for notes/resources/contacts. These are not mandatory
 * CRUD walls — they set expectations and let the user move on. The title/icon
 * already render in StepShell, so this just adds a short reassurance line.
 */
export function ExplainerStep({ meta }: { meta: OnboardingStepMeta }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        You&apos;ll find <span className="font-medium text-foreground">{meta.title.replace(/^.*? /, "")}</span>{" "}
        in the sidebar once you&apos;re in. Nothing to set up now — just so you
        know where it lives.
      </p>
    </div>
  );
}
