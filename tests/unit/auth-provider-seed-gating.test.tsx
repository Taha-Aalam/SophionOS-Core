// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/components/providers/auth-provider";

// Use hoisted mocks so the assertions survive module-hoisting.
const { seedDefaultAreasMock, provisionSubscriptionMock } = vi.hoisted(() => ({
  seedDefaultAreasMock: vi.fn().mockResolvedValue(undefined),
  provisionSubscriptionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/onboarding.service", () => ({
  seedDefaultAreas: seedDefaultAreasMock,
  provisionSubscription: provisionSubscriptionMock,
}));

vi.mock("@/lib/hooks/use-areas", () => ({ AREAS_QUERY_KEY: "areas" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, userId: "user_clerk_1" }),
  useUser: () => ({
    user: {
      primaryEmailAddress: { emailAddress: "user@example.com" },
      fullName: "Test User",
      imageUrl: "",
    },
  }),
  useClerk: () => ({ signOut: vi.fn().mockResolvedValue(undefined) }),
}));

const SEEDED_AT = "2026-11-01T00:00:00+00:00";

function renderProvider(initialAreasSeededAt: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        initialUser={{
          id: "user_clerk_1",
          email: "user@example.com",
          name: "Test User",
          imageUrl: null,
        }}
        initialAreasSeededAt={initialAreasSeededAt}
      >
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
  render(<div>placeholder</div>, { wrapper });
  return { invalidateSpy };
}

describe("AuthProvider seed gating (areas_seeded_at marker)", () => {
  beforeEach(() => {
    seedDefaultAreasMock.mockClear();
    provisionSubscriptionMock.mockClear();
  });

  it("issues no seed work when the account's marker is set", async () => {
    const { invalidateSpy } = renderProvider(SEEDED_AT);

    // provisionSubscription keeps its unchanged idempotent bootstrap role...
    await waitFor(() => {
      expect(provisionSubscriptionMock).toHaveBeenCalled();
    });
    // ...but an initialized account's session issues no seed work at all.
    expect(seedDefaultAreasMock).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("seeds exactly once when the marker is NULL (never initialized)", async () => {
    const { invalidateSpy } = renderProvider(null);

    await waitFor(() => {
      expect(seedDefaultAreasMock).toHaveBeenCalledTimes(1);
    });
    expect(provisionSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["areas", "list", "user_clerk_1"],
    });
  });
});
