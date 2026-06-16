// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";

describe("DeleteEntityPopover — contact detail label", () => {
  it("labels the detail-variant contact trigger 'Delete' (not 'Delete contact permanently')", () => {
    render(
      <DeleteEntityPopover
        variant="detail"
        entityLabel="contact"
        entityName="Jane Doe"
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Delete" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Delete contact permanently"),
    ).not.toBeInTheDocument();
  });
});
