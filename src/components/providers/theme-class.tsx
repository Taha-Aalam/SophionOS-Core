"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeClass() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (resolvedTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return null;
}