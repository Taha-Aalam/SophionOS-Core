import { beforeEach, describe, expect, it } from "vitest";

import { createOnboardingStore } from "@/lib/stores/onboarding.store";
import { ONBOARDING_STEPS } from "@/lib/services/user-settings.service";

describe("onboarding store", () => {
  let store: ReturnType<typeof createOnboardingStore>;

  beforeEach(() => {
    store = createOnboardingStore();
  });

  it("starts on the areas step", () => {
    expect(store.getState().currentStep).toBe("areas");
  });

  it("advances in roadmap order", () => {
    const s = store.getState();
    expect(s.currentStep).toBe("areas");
    s.next();
    expect(store.getState().currentStep).toBe("goal");
    store.getState().next();
    expect(store.getState().currentStep).toBe("project");
  });

  it("does not advance past the last step", () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    // walk to the end
    for (let i = 0; i < ONBOARDING_STEPS.length + 2; i++) store.getState().next();
    expect(store.getState().currentStep).toBe(last);
  });

  it("goes back but never before the first step", () => {
    store.getState().next(); // goal
    store.getState().back(); // areas
    expect(store.getState().currentStep).toBe("areas");
    store.getState().back(); // still areas
    expect(store.getState().currentStep).toBe("areas");
  });

  it("can hydrate from a persisted current step", () => {
    const hydrated = createOnboardingStore({ current_step: "project" });
    expect(hydrated.getState().currentStep).toBe("project");
  });

  it("merges draft data across steps", () => {
    store.getState().setDraft({ goal_id: "g1" });
    store.getState().setDraft({ project_name: "Launch" });
    expect(store.getState().draft).toMatchObject({
      goal_id: "g1",
      project_name: "Launch",
    });
  });

  it("reports completion state and progress index", () => {
    expect(store.getState().isFirstStep).toBe(true);
    expect(store.getState().isLastStep).toBe(false);
    expect(store.getState().stepIndex).toBe(0);
  });
});
