import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { TopicCard } from "@/components/entities/topic-card";
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

describe("TopicCard duplicate badge rendering", () => {
  it("renders a copy badge when duplicateIndex is greater than 1", () => {
    const html = renderToStaticMarkup(
      <TopicCard topic={createTopic({ name: "Alpha" })} duplicateIndex={2} />,
    );

    expect(html).toContain("Alpha");
    expect(html).toContain("copy 2");
  });

  it("does not render a copy badge for the first occurrence", () => {
    const html = renderToStaticMarkup(
      <TopicCard topic={createTopic({ name: "Alpha" })} duplicateIndex={1} />,
    );

    expect(html).toContain("Alpha");
    expect(html).not.toContain("copy");
  });
});

describe("TopicCard memo comparator", () => {
  it("requires a re-render when duplicateIndex changes", () => {
    const comparator = (TopicCard as unknown as {
      compare?: (
        prev: {
          topic: TopicWithCounts;
          duplicateIndex?: number;
          areaNames?: Map<string, string>;
          compact?: boolean;
        },
        next: {
          topic: TopicWithCounts;
          duplicateIndex?: number;
          areaNames?: Map<string, string>;
          compact?: boolean;
        },
      ) => boolean;
    }).compare;

    expect(typeof comparator).toBe("function");

    const topic = createTopic({ id: "topic-2", name: "Alpha" });
    const areaNames = new Map<string, string>([["area-1", "Personal"]]);

    expect(
      comparator!(
        { topic, duplicateIndex: 2, areaNames, compact: false },
        { topic, duplicateIndex: 3, areaNames, compact: false },
      ),
    ).toBe(false);
  });

  it("requires a re-render when areaNames identity changes", () => {
    const comparator = (TopicCard as unknown as {
      compare?: (
        prev: {
          topic: TopicWithCounts;
          duplicateIndex?: number;
          areaNames?: Map<string, string>;
          compact?: boolean;
        },
        next: {
          topic: TopicWithCounts;
          duplicateIndex?: number;
          areaNames?: Map<string, string>;
          compact?: boolean;
        },
      ) => boolean;
    }).compare;

    const topic = createTopic({ id: "topic-3", linkedAreaIds: ["area-1"] });

    expect(
      comparator!(
        {
          topic,
          duplicateIndex: 2,
          areaNames: new Map([["area-1", "Personal"]]),
          compact: false,
        },
        {
          topic,
          duplicateIndex: 2,
          areaNames: new Map([["area-1", "Business"]]),
          compact: false,
        },
      ),
    ).toBe(false);
  });
});
