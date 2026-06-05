// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ResourceDialog } from "@/components/entities/resource-dialog";

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: [] }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: async () => ({ data: [] }),
    }),
  }),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceDialog open onOpenChange={() => {}} onSubmit={() => {}} />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(window.HTMLElement.prototype, "getAnimations", {
    writable: true,
    configurable: true,
    value: () => [],
  });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("ResourceDialog required fields", () => {
  const isDisabled = (btn: HTMLElement) => btn.hasAttribute("disabled");

  it("disables submit when both name and url are empty", () => {
    renderDialog();
    const submit = screen.getByRole("button", { name: /create resource/i });
    expect(isDisabled(submit)).toBe(true);
  });

  it("keeps submit disabled when only name is filled", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/name/i), "My Resource");
    const submit = screen.getByRole("button", { name: /create resource/i });
    expect(isDisabled(submit)).toBe(true);
  });

  it("keeps submit disabled when only url is filled", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/url/i), "https://example.com");
    const submit = screen.getByRole("button", { name: /create resource/i });
    expect(isDisabled(submit)).toBe(true);
  });

  it("enables submit when both name and url are filled", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/name/i), "My Resource");
    await user.type(screen.getByLabelText(/url/i), "https://example.com");
    const submit = screen.getByRole("button", { name: /create resource/i });
    expect(isDisabled(submit)).toBe(false);
  });

  it("marks name and url inputs as required", () => {
    renderDialog();
    const nameInput = screen.getByLabelText(/name/i);
    const urlInput = screen.getByLabelText(/url/i);
    expect(nameInput.hasAttribute("required")).toBe(true);
    expect(urlInput.hasAttribute("required")).toBe(true);
    expect(nameInput.getAttribute("aria-required")).toBe("true");
    expect(urlInput.getAttribute("aria-required")).toBe("true");
  });

  it("treats whitespace-only input as empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/name/i), "   ");
    await user.type(screen.getByLabelText(/url/i), "   ");
    const submit = screen.getByRole("button", { name: /create resource/i });
    expect(isDisabled(submit)).toBe(true);
  });
});
