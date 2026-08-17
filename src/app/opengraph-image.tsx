import { ImageResponse } from "next/og";

/** Generated at build time by next/og, which ships with Next, so this costs no
 *  dependency and no design tool. Kept to system fonts and flat colour on
 *  purpose: embedding a webfont here would mean shipping the file twice. */

export const alt = "DevSpec, write the spec before you build it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 90px",
          background: "linear-gradient(135deg, #0A0D14 0%, #131C2E 55%, #0B1F26 100%)",
          fontFamily: "system-ui, sans-serif", color: "#EDF1F8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 38 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
          }} />
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>DevSpec</div>
        </div>

        <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
          Write the spec
        </div>
        {/* Satori needs an explicit display on any div with more than one
            child, so the two coloured halves are laid out rather than inline. */}
        <div style={{
          display: "flex", gap: 22,
          fontSize: 82, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05,
        }}>
          <span style={{ color: "#3B82F6" }}>before</span>
          <span>you build it</span>
        </div>

        <div style={{ fontSize: 30, color: "#A6B1C6", marginTop: 34, maxWidth: 880 }}>
          Six questions and at least one acceptance check, enforced by the database.
        </div>
      </div>
    ),
    size,
  );
}
