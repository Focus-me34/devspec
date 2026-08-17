import { ImageResponse } from "next/og";

/** Deliberately says nothing about which team. The token lives in the query
 *  string, and an unfurled link in a public channel should not leak the team
 *  name to everyone who can see the message. */

export const alt = "You have been invited to a team on DevSpec";
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
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
          }} />
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>DevSpec</div>
        </div>

        <div style={{
          display: "flex", fontSize: 24, color: "#06B6D4", letterSpacing: 3,
          textTransform: "uppercase", marginBottom: 22,
        }}>
          You have been invited
        </div>

        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
          Join the team
        </div>

        <div style={{ fontSize: 30, color: "#A6B1C6", marginTop: 30, maxWidth: 860 }}>
          Open the link, create an account, and you land straight in it.
        </div>
      </div>
    ),
    size,
  );
}
