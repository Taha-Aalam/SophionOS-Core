import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { AreasByTypeView } from "@/components/views/areas-by-type-view";

describe("AreasByTypeView", () => {
  const mockOnArchive = vi.fn();
  const mockOnCreateArea = vi.fn();
  const areaBase = {
    user_id: "user-1",
    description: null,
    icon: null,
    color: null,
    metadata: {},
    slug: "area-slug",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const groupedAreas = [
    {
      type: "Personal",
      areas: [
        {
          ...areaBase,
          id: "1",
          name: "Active Area",
          slug: "active-area",
          type: "Personal",
          inactive: false,
          archive: false,
        },
        {
          ...areaBase,
          id: "2",
          name: "Inactive Area",
          slug: "inactive-area",
          type: "Personal",
          inactive: true,
          archive: false,
        },
      ],
    },
  ];

  const activeAreaRollups = new Map([
    ["1", { goalsCount: 2, projectsCount: 1, tasksCount: 5, notesCount: 3, resourcesCount: 1 }],
    ["2", { goalsCount: 0, projectsCount: 0, tasksCount: 0, notesCount: 3, resourcesCount: 0 }],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders grouped areas and includes inactive areas with their status badge", () => {
    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreas}
        rollupsByAreaId={activeAreaRollups}
        onCreateArea={mockOnCreateArea}
        onArchive={mockOnArchive}
        isArchiving={false}
      />
    );

    expect(html).toContain("Personal");
    expect(html).toContain("(2 areas)");
    expect(html).toContain("Active Area");
    expect(html).toContain("Inactive Area");
    expect(html).toContain("Paused");
  });

  it("shows 'No activity' badge for areas with zero rollups but not explicitly marked inactive", () => {
    const noActivityAreas = [
      {
        type: "Personal",
        areas: [
          {
            ...areaBase,
            id: "3",
            name: "Empty Area",
            slug: "empty-area",
            type: "Personal",
            inactive: false,
            archive: false,
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={noActivityAreas}
        onCreateArea={mockOnCreateArea}
        onArchive={mockOnArchive}
        isArchiving={false}
      />
    );

    expect(html).toContain("No activity");
  });

  it("renders archive actions for visible, non-archived areas", () => {
    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreas}
        rollupsByAreaId={activeAreaRollups}
        onCreateArea={mockOnCreateArea}
        onArchive={mockOnArchive}
        isArchiving={false}
      />
    );

    expect(html).toContain("Archive area");
  });

  it("filters archived areas out of the by-type view", () => {
    const groupedAreasWithArchived = [
      {
        type: "Business",
        areas: [
          {
            ...areaBase,
            id: "1",
            name: "Active Business Area",
            slug: "active-business-area",
            type: "Business",
            inactive: false,
            archive: false,
          },
          {
            ...areaBase,
            id: "2",
            name: "Archived Business Area",
            slug: "archived-business-area",
            type: "Business",
            inactive: false,
            archive: true,
          },
        ],
      },
    ];

    const businessRollups = new Map([
      ["1", { goalsCount: 1, projectsCount: 0, tasksCount: 0, notesCount: 0, resourcesCount: 0 }],
    ]);

    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreasWithArchived}
        rollupsByAreaId={businessRollups}
        onCreateArea={mockOnCreateArea}
        onArchive={mockOnArchive}
        isArchiving={false}
      />
    );

    expect(html).toContain("Active Business Area");
    expect(html).not.toContain("Archived Business Area");
    expect(html).toContain("(1 area)");
  });
});
