// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { NetworkExplorer } from "@/components/dashboard/network/network-explorer";
import type { Area, Goal, Note, Project, Task } from "@/lib/types/domain.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
});

afterEach(() => {
  cleanup();
});

function renderExplorer() {
  render(
    <NetworkExplorer
      areas={[{ id: "a1", name: "Health", archive: false } as Area]}
      goals={[{ id: "g1", name: "Marathon", linkedAreaIds: ["a1"] } as Goal]}
      projects={[{ id: "p1", name: "Training", linkedGoalIds: ["g1"] } as Project]}
      tasks={[{ id: "t1", name: "Run", linkedProjectIds: ["p1"] } as Task]}
      notes={[{ id: "n1", name: "Plan", linkedTaskIds: ["t1"], notebooks: ["Ideas"] } as Note]}
      resources={[]}
      topics={[]}
      contacts={[]}
    />,
  );
}

describe("NetworkExplorer", () => {
  it("summarizes node and edge counts", () => {
    renderExplorer();
    expect(
      screen.getByText(/6 things · 5 connections/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("removes notebook hubs when Notebooks is unchecked", () => {
    renderExplorer();
    expect(screen.getByText(/Notebooks: 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Notebooks" }));

    expect(screen.queryByText(/Notebooks: 1/)).not.toBeInTheDocument();
    expect(screen.getByText(/5 things · 4 connections/, { exact: false })).toBeInTheDocument();
  });

  it("lists every thing with links in the List tab", () => {
    renderExplorer();
    fireEvent.click(screen.getByRole("tab", { name: "List" }));

    const list = screen.getByRole("tabpanel");
    expect(within(list).getByRole("link", { name: /Health/ })).toHaveAttribute(
      "href",
      "/areas/a1",
    );
    expect(within(list).getByRole("link", { name: /Plan/ })).toHaveAttribute(
      "href",
      "/notes/n1",
    );
  });
});
