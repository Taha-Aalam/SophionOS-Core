"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEP_LIST, type OnboardingStepMeta } from "@/lib/onboarding/steps";

export interface StepShellProps {
  meta: OnboardingStepMeta;
  stepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Disable forward progress until the step's minimum is satisfied. */
  canAdvance?: boolean;
  isBusy?: boolean;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  children: ReactNode;
}

/**
 * Shared wizard chrome: progress dots, title/subtitle, body slot, and the
 * back/next controls. Every step renders through this so spacing and the
 * footer behave identically across the flow.
 */
export function StepShell({
  meta,
  stepIndex,
  isFirstStep,
  isLastStep,
  canAdvance = true,
  isBusy = false,
  nextLabel,
  onBack,
  onNext,
  onSkip,
  children,
}: StepShellProps) {
  const total = ONBOARDING_STEP_LIST.length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-center gap-1.5" aria-hidden>
        {ONBOARDING_STEP_LIST.map((s, i) => (
          <span
            key={s.step}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === stepIndex
                ? "w-8 bg-primary"
                : i < stepIndex
                  ? "w-4 bg-primary/50"
                  : "w-4 bg-muted",
            )}
          />
        ))}
      </div>

      <div className="mb-6 text-center">
        <div className="mb-3 text-4xl">{meta.icon}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex-1">{children}</div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isFirstStep || isBusy}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          {onSkip && !isLastStep && (
            <Button variant="ghost" onClick={onSkip} disabled={isBusy}>
              Skip
            </Button>
          )}
          <Button onClick={onNext} disabled={!canAdvance || isBusy}>
            {isBusy
              ? "Saving…"
              : (nextLabel ?? (isLastStep ? "Finish" : "Continue"))}
          </Button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Step {stepIndex + 1} of {total}
      </p>
    </div>
  );
}
