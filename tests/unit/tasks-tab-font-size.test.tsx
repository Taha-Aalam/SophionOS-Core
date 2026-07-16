import { expect, it } from "vitest";

it("tasks page tab triggers use text-xs not text-sm", async () => {
  const fs = await import("fs/promises");
  const src = await fs.readFile(
    new URL("../../src/app/(dashboard)/tasks/tasks-content.tsx", import.meta.url),
    "utf-8",
  );
  // Dense mobile-friendly tabs: override default TabsTrigger text-sm via className.
  expect(src).not.toMatch(/<TabsTrigger[^>]*\btext-sm\b/);
  expect(src).toMatch(/<TabsTrigger[^>]*\btext-xs\b/);
});