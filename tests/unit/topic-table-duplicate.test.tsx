import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseTopics = vi.fn();
const mockUseAreas = vi.fn();

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => mockUseTopics(),
  useTopic: () => ({ data: null, isLoading: false }),
  useCreateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTopic: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleFavoriteTopic: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => mockUseAreas(),
}));

vi.mock("@/components/entities/topic-card", () => ({
  TopicCard: ({ topic }: { topic: { name: string } }) => (
    <div data-slot="topic-card">{topic.name}</div>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import TopicsPage from "@/app/(dashboard)/topics/page";
import type { TopicWithCounts } from "@/lib/services/topic.service";

function createTopic(overrides: Partial<TopicWithCounts> = {}): TopicWithCounts {
  const now = new Date().toISOString();

  return {
    id: "topic-1",
    user_id: "user-1",
    area_id: null,
    name: "Test Topic",
    favorite: false,
    inactive: false,
    metadata: {},
    created_at: now,
    updated_at: now,
    linkedAreaIds: [],
    notesCount: 0,
    resourcesCount: 0,
    ...overrides,
  };
}

describe("TopicsPage All (table) duplicate badge coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders copy badges in the table name cell for later duplicate occurrences", () => {
    mockUseTopics.mockReturnValue({
      data: [
        createTopic({ id: "topic-1", name: "Alpha", created_at: "2026-04-27T10:00:00.000Z" }),
        createTopic({ id: "topic-2", name: "Alpha", created_at: "2026-04-27T11:00:00.000Z" }),
      ],
      isLoading: false,
    });
    mockUseAreas.mockReturnValue({
      data: [],
    });

    const html = renderToStaticMarkup(<TopicsPage />);

    expect(html).toContain("All (table)");
    expect(html).toContain("Alpha");
    expect(html).toContain("copy 2");
  });

  it("does not render copy text for a unique topic in the table row", () => {
    mockUseTopics.mockReturnValue({
      data: [createTopic({ id: "topic-1", name: "Solo Topic" })],
      isLoading: false,
    });
    mockUseAreas.mockReturnValue({
      data: [],
    });

    const html = renderToStaticMarkup(<TopicsPage />);

    expect(html).toContain("Solo Topic");
    expect(html).not.toContain("copy 2");
    expect(html).not.toContain("copy 3");
  });
});
