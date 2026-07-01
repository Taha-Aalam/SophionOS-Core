import { describe, expect, it } from "vitest";

import {
  resolveDashboardDestination,
  resolveOnboardingDestination,
} from "@/lib/onboarding/onboarding-routing";

describe("onboarding route guards", () => {
  it("redirects incomplete users from /dashboard to /onboarding", async () => {
    expect(await resolveDashboardDestination({ completed: false })).toBe("/onboarding");
  });

  it("lets completed users stay on the dashboard", async () => {
    expect(await resolveDashboardDestination({ completed: true })).toBeNull();
  });

  it("treats a missing onboarding record as incomplete", async () => {
    expect(await resolveDashboardDestination(null)).toBe("/onboarding");
  });

  it("redirects completed users away from /onboarding to /dashboard", async () => {
    expect(await resolveOnboardingDestination({ completed: true })).toBe("/dashboard");
  });

  it("lets incomplete users stay on the onboarding flow", async () => {
    expect(await resolveOnboardingDestination({ completed: false })).toBeNull();
  });

  it("keeps a missing record on the onboarding flow", async () => {
    expect(await resolveOnboardingDestination(null)).toBeNull();
  });
});
