"use client";

import { useRouter } from "next/navigation";

import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard";

// Overlays that own the Escape key. When any is present in the DOM, Escape
// should close the overlay (handled by Base UI / cmdk), not navigate back.
const OVERLAY_SELECTOR =
  '[data-slot="dialog-content"],[data-slot="popover-content"],[role="dialog"],[role="menu"],[role="listbox"]';

/**
 * Registers a global Escape handler that navigates to `backHref`, mirroring the
 * page's Back button. Reuse the SAME `backHref` the Back button uses (typically
 * `popReturnToHref(searchParams, fallback)`) so `returnTo`/`chain` unwinding is
 * inherited for free.
 *
 * Pass a falsy `backHref` on pages that have no Back button — Escape then does
 * nothing. Escape is also ignored (left to the focused control / open overlay)
 * when focus is in an <input>/<textarea>/contentEditable element, or when an
 * open dialog / popover / menu / listbox is in the DOM.
 */
export function useEscapeBack(backHref: string | null | undefined): void {
  const router = useRouter();

  useKeyboardShortcut(
    (e) => {
      if (e.key !== "Escape") return false;
      if (!backHref) return false;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return false;
        }
      }

      if (document.querySelector(OVERLAY_SELECTOR)) return false;

      return true;
    },
    () => {
      if (backHref) router.push(backHref);
    },
  );
}
