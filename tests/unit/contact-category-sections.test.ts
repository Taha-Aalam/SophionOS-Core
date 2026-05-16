import { describe, expect, it } from "vitest";

import {
  buildAreaSections,
  buildGoalSections,
  buildGroupSections,
  buildProjectSections,
} from "@/lib/utils/contact-category-sections";

describe("contact category section builders", () => {
  it("filters out groups with no contacts", () => {
    const sections = buildGroupSections({
      Client: [{ id: "c1", name: "Ada" } as never],
    });

    expect(sections.find((section) => section.label === "Client")?.contacts).toHaveLength(1);
    expect(sections.find((section) => section.label === "Mentor")).toBeUndefined();
  });

  it("filters out projects, areas, and goals with zero linked contacts", () => {
    expect(
      buildProjectSections(
        [{ id: "p1", name: "Project Alpha", is_archived: false } as never],
        [],
      ),
    ).toHaveLength(0);

    expect(
      buildAreaSections(
        [{ id: "a1", name: "Health", archive: false } as never],
        [],
      ),
    ).toHaveLength(0);

    expect(
      buildGoalSections(
        [{ id: "g1", name: "Ship V2", is_archived: false } as never],
        [],
      ),
    ).toHaveLength(0);
  });
});
