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
              border: "1px solid #4f46e5",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              outlineOffset: "2px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "2px solid #818cf8";
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
