/**
 * Feature gates for the browser-native fallbacks (C6/C7).
 * The CSS `@supports` conditions in globals.css mirror these checks; keep them
 * in sync so a browser never takes one path in CSS and the other in JS.
 */

/** scrollytelling guide: the animation-range probe filters partial support. */
export function supportsScrollDrivenAnimations(): boolean {
  if (typeof window === "undefined" || typeof window.CSS?.supports !== "function") {
    return false;
  }
  return (
    window.CSS.supports("animation-timeline: scroll()") &&
    window.CSS.supports("animation-range: 0% 100%") &&
    // The CSS names the nav timeline and hoists it to the cue wrapper.
    window.CSS.supports("scroll-timeline-name: --sidebar-nav-scroll") &&
    window.CSS.supports("timeline-scope: --sidebar-nav-scroll")
  );
}

/** Probe the @starting-style at-rule itself; CSS.supports has no at-rule form
 * reliable across the whole target set. */
export function supportsStartingStyle(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const style = document.createElement("style");
    style.textContent = "@starting-style { .__starting-style-probe { opacity: 0; } }";
    document.head.appendChild(style);
    const supported = Boolean(style.sheet && style.sheet.cssRules.length > 0);
    style.remove();
    return supported;
  } catch {
    return false;
  }
}
