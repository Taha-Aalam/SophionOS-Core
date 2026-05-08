import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NoteArchiveToggle } from "@/components/entities/note-archive-toggle";

describe("NoteArchiveToggle", () => {
  it("renders Archive copy for active notes in row mode", () => {
    const html = renderToStaticMarkup(
      <NoteArchiveToggle
        isArchived={false}
        mode="row"
        onClick={vi.fn()}
      />,
    );

    expect(html).toContain("Archive");
    expect(html).toContain("group-hover:opacity-100");
  });

  it("renders Restore copy for archived notes in detail mode", () => {
    const html = renderToStaticMarkup(
      <NoteArchiveToggle
        isArchived
        mode="detail"
        onClick={vi.fn()}
      />,
    );

    expect(html).toContain("Restore");
    expect(html).not.toContain("group-hover:opacity-100");
  });

  it("forwards standard button props to the underlying button", () => {
    const html = renderToStaticMarkup(
      <NoteArchiveToggle
        isArchived={false}
        mode="detail"
        onClick={vi.fn()}
        aria-label="Archive note"
        data-testid="archive-toggle"
        id="archive-toggle"
        tabIndex={0}
      />,
    );

    expect(html).toContain('aria-label="Archive note"');
    expect(html).toContain('data-testid="archive-toggle"');
    expect(html).toContain('id="archive-toggle"');
    expect(html).toContain('tabindex="0"');
  });
});
