/**
 * Apple touch icon: the king piece, as in `icon.tsx`, at the size iOS pins to a
 * home screen. A separate file because the convention is per-size, and the piece
 * wants more breathing room here than in a 16 px tab.
 *
 * 📖 Docs: obsidian/frontend/seo-metadata.md
 */

import { ImageResponse } from "next/og";

import { KingMark } from "@/lib/king-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
        }}
      >
        <KingMark size={176} />
      </div>
    ),
    { ...size },
  );
}
