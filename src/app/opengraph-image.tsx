import { ImageResponse } from "next/og";

export const alt = "Diwaan Shah Khwaan — home-cooked Pakistani takeaway, Langford WA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 30%, #3a1a14 0%, #17110d 70%)", color: "#e7c873", fontFamily: "serif" }}>
        <div style={{ fontSize: 34, letterSpacing: 12, color: "#c9a24a" }}>DSK</div>
        <div style={{ fontSize: 110, marginTop: 10 }}>Diwaan</div>
        <div style={{ fontSize: 64, color: "#f2e8d5", marginTop: -6 }}>Shah Khwaan</div>
        <div style={{ fontSize: 30, color: "#b9a88c", marginTop: 28 }}>Royal flavours served with love · Order ahead · Langford WA</div>
      </div>
    ),
    size,
  );
}
