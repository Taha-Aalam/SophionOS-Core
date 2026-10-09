"use client";

/**
 * Root error boundary. Catches throws that escape the root layout itself,
 * which would otherwise produce an unrecoverable white screen. Because it
 * replaces the root layout when active, it must render its own <html>/<body>.
 */
export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0b0b10",
          color: "#fafafa",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "2rem", textAlign: "center" }}>
          {/* Logo is referenced from the shared /brand/ source of truth, never
              inlined as path data. Reversed (white) cut because this page's
              ground is dark. A plain <img> is deliberate: this boundary renders
              when the root layout has already crashed, so it must not depend on
              hydration or the Next image runtime to show the mark. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/sophion-symbol-reversed-white.svg"
            alt=""
            width={56}
            height={56}
            style={{ display: "block", margin: "0 auto 1.5rem" }}
          />
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#a1a1aa", fontSize: "0.875rem" }}>
            The app hit an unexpected error and could not recover this view.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              // Brand palette: Sophion Indigo fill, Indigo Light edge so the
              // button boundary clears 3:1 against the near-black ground.
              border: "1px solid #a5b4fc",
              background: "#4338ca",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              outlineOffset: "2px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "2px solid #a5b4fc";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
