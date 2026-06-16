// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useEscapeBack } from "@/lib/hooks/use-escape-back";

function Harness({ backHref }: { backHref: string | null }) {
  useEscapeBack(backHref);
  return <div>harness</div>;
}

function pressEscape(target: EventTarget = document) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

describe("useEscapeBack", () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.body.innerHTML = "";
  });

  it("navigates to backHref on Escape", () => {
    render(<Harness backHref="/contacts" />);
    pressEscape();
    expect(pushMock).toHaveBeenCalledWith("/contacts");
  });

  it("does nothing when backHref is null (page has no Back button)", () => {
    render(<Harness backHref={null} />);
    pressEscape();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does nothing while focus is in a text field", () => {
    render(<Harness backHref="/contacts" />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    pressEscape(input);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does nothing when an overlay (role=dialog) is open", () => {
    render(<Harness backHref="/contacts" />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    pressEscape();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does nothing when a popover content is open", () => {
    render(<Harness backHref="/contacts" />);
    const popover = document.createElement("div");
    popover.setAttribute("data-slot", "popover-content");
    document.body.appendChild(popover);
    pressEscape();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
