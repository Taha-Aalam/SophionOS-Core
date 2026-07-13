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
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            S
          </div>
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
