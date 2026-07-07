import React from "react";

/**
 * Returns accessibility props for a clickable non-interactive element.
 * Adds `role="button"`, `tabIndex={0}`, and `onKeyDown` that activates
 * the callback on Enter or Space (matching native <button> behavior).
 */
export function useClickableProps(onClick: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}
