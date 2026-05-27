import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TaskArchiveToggle } from "@/components/entities/task-archive-toggle";

describe("TaskArchiveToggle", () => {
  it("renders Archive label for active task in row mode", () => {
    const html = renderToStaticMarkup(
      <TaskArchiveToggle isArchived={false} mode="row" onClick={vi.fn()} />,
    );

    expect(html).toContain("Archive");
    expect(html).not.toContain("Restore");
  });

  it("renders Restore label for archived task in detail mode", () => {
    const html = renderToStaticMarkup(
      <TaskArchiveToggle isArchived mode="detail" onClick={vi.fn()} />,
    );

    expect(html).toContain("Restore");
    expect(html).not.toContain("Archive");
  });

  it("renders Archive label for active task in detail mode", () => {
    const html = renderToStaticMarkup(
      <TaskArchiveToggle isArchived={false} mode="detail" onClick={vi.fn()} />,
    );

    expect(html).toContain("Archive");
  });

  it("renders Restore label for archived task in row mode", () => {
    const html = renderToStaticMarkup(
      <TaskArchiveToggle isArchived mode="row" onClick={vi.fn()} />,
    );

    expect(html).toContain("Restore");
  });
});
