import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ContactsByCategoryView } from "@/components/views/contacts-by-category-view";

describe("ContactsByCategoryView", () => {
  it("renders collapsible category headings, counts, and the inline create tile", () => {
    const html = renderToStaticMarkup(
      <ContactsByCategoryView
        sections={[
          {
            id: "group:Client",
            label: "Client",
            createLabel: "New Client Contact",
            contacts: [{ id: "1", slug: "ada", name: "Ada" } as never],
          },
        ]}
        onCreateInSection={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(html).toContain("Client");
    expect(html).toContain("New Client Contact");
    expect(html).toContain("Ada");
  });
});
