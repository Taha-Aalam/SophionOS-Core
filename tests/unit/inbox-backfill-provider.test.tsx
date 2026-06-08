// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";

// Mock the auth provider so we don't need a real user.
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

// Use hoisted mocks so we can assert on them after the test.
const { taskBackfill, projectBackfill, noteBackfill, resourceBackfill } = vi.hoisted(() => ({
  taskBackfill: vi.fn().mockResolvedValue(0),
  projectBackfill: vi.fn().mockResolvedValue(0),
  noteBackfill: vi.fn().mockResolvedValue(0),
  resourceBackfill: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/services/note.service", () => ({
  noteService: { backfillStaleStatuses: noteBackfill },
}));
vi.mock("@/lib/services/project.service", () => ({
  projectService: { backfillStaleStatuses: projectBackfill },
}));
vi.mock("@/lib/services/task.service", () => ({
  taskService: { backfillStaleStatuses: taskBackfill },
}));
vi.mock("@/lib/services/resource.service", () => ({
  resourceService: { backfillStaleStatuses: resourceBackfill },
}));

describe("InboxBackfillProvider", () => {
  it("renders its children without crashing", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <InboxBackfillProvider>{children}</InboxBackfillProvider>
      </QueryClientProvider>
    );
    const { container } = render(<div>hello</div>, { wrapper });
    expect(container.textContent).toBe("hello");
  });

  it("invokes the backfill services once on mount", async () => {
    taskBackfill.mockClear();
    projectBackfill.mockClear();
    noteBackfill.mockClear();
    resourceBackfill.mockClear();

    // The provider's on-mount effect is gated by a sessionStorage flag;
    // clear it so we don't inherit a flag from a prior run.
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem("inbox-backfill:v3");
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <InboxBackfillProvider>{children}</InboxBackfillProvider>
      </QueryClientProvider>
    );
    render(<div>placeholder</div>, { wrapper });

    await waitFor(() => {
      expect(taskBackfill).toHaveBeenCalled();
    });
    expect(projectBackfill).toHaveBeenCalled();
    expect(noteBackfill).toHaveBeenCalled();
    expect(resourceBackfill).toHaveBeenCalled();
  });
});

