/**
 * Favicon: the king piece in gold, with no background (a transparent PNG).
 *
 * A Next file convention: the `<link rel="icon">` is injected automatically, so
 * nothing in `generateMetadata` needs to name it. Drawn at build time rather
 * than shipped as a PNG, so it always carries the real brand colour.
 *
 * 📖 Docs: obsidian/frontend/seo-metadata.md
 */

import { ImageResponse } from "next/og";

import { KingMark } from "@/lib/king-mark";

export const size = { width: 64, height: 64 };
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
        }}
      >
        <KingMark size={64} />
      </div>
    ),
    { ...size },
  );
}
