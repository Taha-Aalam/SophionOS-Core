import { createStore } from "zustand/vanilla";

import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/services/user-settings.service";

export interface OnboardingStoreState {
  currentStep: OnboardingStep;
  draft: Record<string, unknown>;
  stepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  next: () => void;
  back: () => void;
  goTo: (step: OnboardingStep) => void;
  setDraft: (patch: Record<string, unknown>) => void;
  reset: () => void;
}

function indexOfStep(step: OnboardingStep): number {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i === -1 ? 0 : i;
}

function derive(index: number) {
  const clamped = Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1));
  return {
    currentStep: ONBOARDING_STEPS[clamped],
    stepIndex: clamped,
    isFirstStep: clamped === 0,
    isLastStep: clamped === ONBOARDING_STEPS.length - 1,
  };
}

export interface OnboardingStoreInit {
  current_step?: OnboardingStep;
  draft?: Record<string, unknown>;
}

/**
 * Vanilla store factory so the wizard flow is unit-testable without React and
 * so each mount starts from server-hydrated state. Steps advance in the single
 * roadmap order defined by ONBOARDING_STEPS; next/back are clamped to the ends.
 */
export function createOnboardingStore(init: OnboardingStoreInit = {}) {
  const startIndex = indexOfStep(init.current_step ?? "areas");

  return createStore<OnboardingStoreState>((set, get) => ({
    ...derive(startIndex),
    draft: init.draft ?? {},
    next: () => set(derive(get().stepIndex + 1)),
    back: () => set(derive(get().stepIndex - 1)),
    goTo: (step) => set(derive(indexOfStep(step))),
    setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
    reset: () => set({ ...derive(0), draft: {} }),
  }));
}
