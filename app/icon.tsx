import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0284c7 0%, #0ea5e9 100%)",
          fontSize: 18,
          color: "white",
        }}
      >
        ✈
      </div>
    ),
    { ...size }
  );
}
