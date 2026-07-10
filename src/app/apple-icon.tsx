import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ana ekran / App Store wrapper ikonu — PNG olaraq generasiya olunur.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#E31C5F",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1,
          }}
        >
          g
        </div>
      </div>
    ),
    { ...size }
  );
}
