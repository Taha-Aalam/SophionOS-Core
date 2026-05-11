import React from "react";
import { describe, expect, it } from "vitest";

it("tasks page tab triggers use text-xs not text-sm", async () => {
  const fs = await import("fs/promises");
  const src = await fs.readFile(
    new URL("../../src/app/(dashboard)/tasks/page.tsx", import.meta.url),
    "utf-8",
  );
  expect(src).not.toMatch(/TabsTrigger[^>]*text-sm/);
  expect(src).toMatch(/TabsTrigger[^>]*text-xs/);
});