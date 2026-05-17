// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ContactDialog } from "@/components/entities/contact-dialog";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({
    data: [{ id: "area-1", name: "Work", icon: null, archive: false }],
  }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({
    data: [{ id: "goal-1", name: "Launch", is_archived: false }],
  }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({
    data: [{ id: "project-1", name: "Website Refresh", is_archived: false }],
  }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({
    data: [{ id: "task-1", name: "Ship landing page" }],
  }),
}));

vi.mock("@/lib/hooks/use-contact-relationship-options", () => ({
  useContactRelationshipOptions: () => ({
    visibleAreas: [{ id: "area-1", name: "Work", icon: null, archive: false }],
    filteredGoals: [{ id: "goal-1", name: "Launch", is_archived: false }],
    filteredProjects: [{ id: "project-1", name: "Website Refresh", is_archived: false }],
    filteredTasks: [{ id: "task-1", name: "Ship landing page" }],
    isRelationsLoading: false,
    cleanSelections: () => ({
      areaIds: [],
      goalIds: [],
      projectIds: [],
      taskIds: [],
      changed: false,
    }),
  }),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ContactDialog open onOpenChange={() => {}} onSubmit={() => {}} />
    </QueryClientProvider>,
  );
}

async function clickOptionLabel(triggerName: string | RegExp, optionName: string | RegExp) {
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: triggerName }));

  const menuItem = await screen.findByRole("menuitemcheckbox", { name: optionName });

  await user.click(menuItem);

  return menuItem as HTMLElement;
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

describe("ContactDialog relation dropdown labels", () => {
  it("toggles an area when its label is clicked", async () => {
    renderDialog();

    const menuItem = await clickOptionLabel(/select areas/i, "Work");

    await waitFor(() => {
      expect(menuItem.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a goal when its label is clicked", async () => {
    renderDialog();

    const menuItem = await clickOptionLabel(/select goals/i, "Launch");

    await waitFor(() => {
      expect(menuItem.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a project when its label is clicked", async () => {
    renderDialog();

    const menuItem = await clickOptionLabel(/select projects/i, "Website Refresh");

    await waitFor(() => {
      expect(menuItem.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a task when its label is clicked", async () => {
    renderDialog();

    const menuItem = await clickOptionLabel(/select tasks/i, "Ship landing page");

    await waitFor(() => {
      expect(menuItem.getAttribute("aria-checked")).toBe("true");
    });
  });
});
