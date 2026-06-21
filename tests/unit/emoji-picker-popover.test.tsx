import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Stub emoji-mart (default export) so SSR doesn't try to load the dataset.
vi.mock("@emoji-mart/react", () => ({
  default: () => null,
}));

import { EmojiPickerPopover } from "@/components/ui/emoji-picker-popover";

describe("EmojiPickerPopover", () => {
  it("renders the current emoji in the trigger button", () => {
    const html = renderToStaticMarkup(
      <EmojiPickerPopover value="💼" onChange={() => {}} />,
    );
    expect(html).toContain("💼");
  });

  it("renders the placeholder text when value is null", () => {
    const html = renderToStaticMarkup(
      <EmojiPickerPopover
        value={null}
        onChange={() => {}}
        placeholder="Pick an icon"
      />,
    );
    expect(html).toContain("Pick an icon");
  });

  it("renders the disabled attribute when disabled is set", () => {
    const html = renderToStaticMarkup(
      <EmojiPickerPopover value="💼" onChange={() => {}} disabled />,
    );
    expect(html).toMatch(/disabled/);
  });
});
