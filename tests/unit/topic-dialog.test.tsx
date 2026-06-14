// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicDialog } from "@/components/entities/topic-dialog";

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: [] }),
  useCreateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-areas", () => ({ useAreas: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/use-notes", () => ({ useNotes: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/use-resources", () => ({ useResources: () => ({ data: [] }) }));

describe("TopicDialog", () => {
  it("renders the Create title in create mode", () => {
    render(<TopicDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/New Topic/)).toBeInTheDocument();
  });

  it("renders the Edit title when topic is provided", () => {
    render(
      <TopicDialog
        open
        onOpenChange={() => {}}
        topic={{
          id: "t1", name: "Productivity", linkedAreaIds: [], favorite: false,
          inactive: false, created_at: "2026-01-01T00:00:00Z",
          areaNames: {}, areaIcons: {},
        }}
      />,
    );
    expect(screen.getByText(/Edit Topic/)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const onOpenChange = vi.fn();
    render(<TopicDialog open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
