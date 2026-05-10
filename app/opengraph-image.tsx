import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Skyflint — Hunt cheap flights";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 45%, #bae6fd 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.04em",
              textShadow: "0 4px 24px rgba(15, 23, 42, 0.25)",
            }}
          >
            Skyflint
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 32,
              fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Hunt cheap flights
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
