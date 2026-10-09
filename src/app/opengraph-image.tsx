import { ImageResponse } from "next/og";

export const alt = "SophionOS Core";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded OG card. Server-rendered via Satori; uses a system sans stack so it
// builds without fetching web fonts. Mirrors the calm indigo palette.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0b1020 0%, #0f172a 55%, #141a33 100%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Mandorla, reversed cut (thinner wall) because it sits on a dark ground.
              The only place in the app where the mark's path data is duplicated
              rather than referenced from /brand/: Satori renders with no HTTP
              access and its image pipeline cannot rasterise an SVG data URI
              (verified - it fails the build with "svgload_buffer: SVG rendering
              failed"). Inline JSX <svg> is the only form Satori will accept. */}
          <svg width="64" height="64" viewBox="0 0 256 256" fill="#fff" aria-hidden>
            <path d="M113 18.04 A122.1 122.1 0 0 0 44.01 128 A122.1 122.1 0 0 0 113 237.96 L113 216.27 A104 104 0 0 1 64 128 A104 104 0 0 1 113 39.73 Z" />
            <path d="M143 18.04 A122.1 122.1 0 0 1 211.99 128 A122.1 122.1 0 0 1 143 237.96 L143 216.27 A104 104 0 0 0 192 128 A104 104 0 0 0 143 39.73 Z" />
          </svg>
          <span style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            SophionOS
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "68px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            One calm system for your whole life
          </div>
          <div style={{ fontSize: "30px", color: "#a5b4fc", fontWeight: 500 }}>
            Goals, projects, notes, and people, organized.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "24px", color: "#71717a", fontWeight: 500 }}>
          sophionos.com
        </div>
      </div>
    ),
    { ...size },
  );
}
