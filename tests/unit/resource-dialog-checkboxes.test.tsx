// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ResourceDialog } from "@/components/entities/resource-dialog";

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({
    data: [{ id: "area-1", name: "Work", icon: null, archive: false }],
  }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({
    data: [{ id: "goal-1", name: "Launch", area_id: "area-1", linkedAreaIds: [] }],
  }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({
    data: [{ id: "project-1", name: "Website Refresh", area_id: "area-1", linkedAreaIds: [] }],
  }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({
    data: [{ id: "task-1", name: "Ship landing page", area_id: "area-1", project_id: "project-1", linkedAreaIds: [] }],
  }),
}));

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({
    data: [],
  }),
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
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceDialog open onOpenChange={() => {}} onSubmit={() => {}} />
    </QueryClientProvider>,
  );
}

async function clickFirstCheckboxForTrigger(triggerName: string | RegExp, optionName: string | RegExp) {
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: triggerName }));

  await screen.findByText(optionName);

  const option = screen.getByText(optionName);
  const popoverContent = option.closest('[data-slot="popover-content"]');

  if (!popoverContent) {
    throw new Error(`Could not find the popover content for ${String(optionName)}`);
  }

  const [checkbox] = within(popoverContent as HTMLElement).getAllByRole("checkbox");
  await user.click(checkbox);
  return popoverContent as HTMLElement;
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

describe("ResourceDialog relation pickers", () => {
  it("toggles an area when its checkbox is clicked", async () => {
    renderDialog();

    const popoverContent = await clickFirstCheckboxForTrigger(/select areas/i, "Work");

    await waitFor(() => {
      expect(within(popoverContent).getAllByRole("checkbox")[0]?.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a goal when its checkbox is clicked", async () => {
    renderDialog();

    const popoverContent = await clickFirstCheckboxForTrigger(/select goals/i, "Launch");

    await waitFor(() => {
      expect(within(popoverContent).getAllByRole("checkbox")[0]?.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a project when its checkbox is clicked", async () => {
    renderDialog();

    const popoverContent = await clickFirstCheckboxForTrigger(/select project/i, "Website Refresh");

    await waitFor(() => {
      expect(within(popoverContent).getAllByRole("checkbox")[0]?.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("toggles a task when its checkbox is clicked", async () => {
    renderDialog();

    const popoverContent = await clickFirstCheckboxForTrigger(/select tasks/i, "Ship landing page");

    await waitFor(() => {
      expect(within(popoverContent).getAllByRole("checkbox")[0]?.getAttribute("aria-checked")).toBe("true");
    });
  });
});
