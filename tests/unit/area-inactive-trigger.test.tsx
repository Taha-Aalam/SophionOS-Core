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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders grouped areas and includes inactive areas with their status badge", () => {
    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreas}
        onCreateArea={mockOnCreateArea}
        onArchive={mockOnArchive}
        isArchiving={false}
      />
    );

    expect(html).toContain("Personal");
    expect(html).toContain("(2 areas)");
    expect(html).toContain("Active Area");
    expect(html).toContain("Inactive Area");
    expect(html).toContain("No activity");
  });

  it("renders archive actions for visible, non-archived areas", () => {
    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreas}
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

    const html = renderToStaticMarkup(
      <AreasByTypeView
        groupedAreas={groupedAreasWithArchived}
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
