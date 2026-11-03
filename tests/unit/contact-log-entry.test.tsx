// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ContactLogEntry } from "@/components/entities/contact-log-entry";
import type { ContactLog } from "@/lib/types/domain.types";

function makeLog(overrides: Partial<ContactLog> = {}): ContactLog {
  return {
    id: "log-1",
    user_id: "user-1",
    contact_id: "contact-1",
    message: "Short log note",
    logged_at: "2026-11-03T00:00:00.000Z",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("ContactLogEntry component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a short entry (<= 500 chars) in full with no control", () => {
    const text500 = "a".repeat(500);
    const log = makeLog({ id: "log-short", message: text500 });
    render(<ContactLogEntry log={log} />);

    expect(screen.getByText(text500)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /read more/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show less/i })).not.toBeInTheDocument();

    const paragraph = screen.getByText(text500);
    expect(paragraph.className).not.toContain("line-clamp-4");
  });

  it("renders an entry of exactly 500 characters with no control", () => {
    const text500 = "x".repeat(500);
    const log = makeLog({ id: "log-500", message: text500 });
    render(<ContactLogEntry log={log} />);

    expect(screen.getByText(text500)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /read more/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show less/i })).not.toBeInTheDocument();
  });

  it("renders an entry of exactly 501 characters with the 'Read more' control", () => {
    const text501 = "x".repeat(501);
    const log = makeLog({ id: "log-501", message: text501 });
    render(<ContactLogEntry log={log} />);

    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();
    const paragraph = screen.getByText(text501);
    expect(paragraph.className).toContain("line-clamp-4");
  });
  it("renders a long entry (> 500 chars) collapsed with 'Read more', and expands on activation", async () => {
    const user = userEvent.setup();
    const longText = "Discussion notes: " + "detailed agenda item and minutes follow up. ".repeat(20); // > 500 chars
    expect(longText.length).toBeGreaterThan(500);

    const log = makeLog({ id: "log-long", message: longText });
    render(<ContactLogEntry log={log} />);

    // Initially clamped
    const paragraph = screen.getByText((content) => content.startsWith("Discussion notes:"));
    expect(paragraph.className).toContain("line-clamp-4");

    const readMoreBtn = screen.getByRole("button", { name: /read more/i });
    expect(readMoreBtn).toBeInTheDocument();

    // Activate: expands
    await user.click(readMoreBtn);

    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /read more/i })).not.toBeInTheDocument();
    expect(paragraph.className).not.toContain("line-clamp-4");
    expect(paragraph.textContent).toBe(longText);

    // Activate again: re-collapses
    const showLessBtn = screen.getByRole("button", { name: /show less/i });
    await user.click(showLessBtn);

    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show less/i })).not.toBeInTheDocument();
    expect(paragraph.className).toContain("line-clamp-4");
    expect(paragraph.textContent).toBe(longText);
  });

  it("expands and collapses two long entries independently", async () => {
    const user = userEvent.setup();
    const textA = "First log: " + "details for log item A. ".repeat(30);
    const textB = "Second log: " + "details for log item B. ".repeat(30);
    expect(textA.length).toBeGreaterThan(500);
    expect(textB.length).toBeGreaterThan(500);

    const logA = makeLog({ id: "log-a", message: textA });
    const logB = makeLog({ id: "log-b", message: textB });

    render(
      <div>
        <ContactLogEntry log={logA} />
        <ContactLogEntry log={logB} />
      </div>,
    );
    const paraA = screen.getByText((content) => content.startsWith("First log:"));
    const paraB = screen.getByText((content) => content.startsWith("Second log:"));
    const buttons = screen.getAllByRole("button", { name: /read more/i });
    expect(buttons).toHaveLength(2);

    expect(paraA.className).toContain("line-clamp-4");
    expect(paraB.className).toContain("line-clamp-4");

    // Click first entry's Read more
    await user.click(buttons[0]);

    // First is expanded, second remains collapsed
    expect(paraA.className).not.toContain("line-clamp-4");
    expect(paraB.className).toContain("line-clamp-4");
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();

    // Click second entry's Read more
    const remainingReadMore = screen.getByRole("button", { name: /read more/i });
    await user.click(remainingReadMore);

    // Both are expanded
    expect(paraA.className).not.toContain("line-clamp-4");
    expect(paraB.className).not.toContain("line-clamp-4");
    expect(screen.getAllByRole("button", { name: /show less/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /read more/i })).not.toBeInTheDocument();

    // Collapse first entry
    const showLessButtons = screen.getAllByRole("button", { name: /show less/i });
    await user.click(showLessButtons[0]);

    // First re-collapses, second remains expanded
    expect(paraA.className).toContain("line-clamp-4");
    expect(paraB.className).not.toContain("line-clamp-4");
    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });
});
