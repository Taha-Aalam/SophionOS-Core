import { describe, expect, it } from "vitest";

// Simple static test that verifies the PwaProvider module can be imported
// and exports the expected component. Full SW registration testing requires
// a browser environment.

describe("PWA provider", () => {
  it("exports a valid component", async () => {
    // Dynamic import to avoid jsdom issues with navigator global
    const { PwaProvider } = await import("@/components/providers/pwa-provider");
    expect(typeof PwaProvider).toBe("function");
  });
});
