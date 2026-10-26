/**
 * The king piece, drawn as an SVG for the favicon and the home-screen icon.
 *
 * `next/og` rasterises in Node with no stylesheet, so the colours are literal
 * (gold and the brand blue from `lib/site.ts`). The shape is a plain silhouette
 * on a 64 x 64 grid so it stays readable when scaled down to 16 px.
 */

const GOLD = "#f5b400";
const GOLD_SHADE = "#c98f00";

/** The four parts of the king, as path data on the 64 x 64 grid. */
export const KING_PATHS = {
  cross: "M29 3h6v5h5v6h-5v5h-6v-5h-5V8h5z",
  head: "M32 21c-8 0-13 5-13 11 0 4 2 7 5 9l-3 7h22l-3-7c3-2 5-5 5-9 0-6-5-11-13-11z",
  collar: "M20.5 48h23a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-23a1.5 1.5 0 0 1-1.5-1.5v-2a1.5 1.5 0 0 1 1.5-1.5z",
  base: "M14 53h36l3 8H11z",
} as const;

export const KingMark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    {/* cross */}
    <path d="M29 3h6v5h5v6h-5v5h-6v-5h-5V8h5z" fill={GOLD} />
    {/* head and shoulders */}
    <path d="M32 21c-8 0-13 5-13 11 0 4 2 7 5 9l-3 7h22l-3-7c3-2 5-5 5-9 0-6-5-11-13-11z" fill={GOLD} />
    {/* collar and base */}
    <rect x="19" y="48" width="26" height="5" rx="1.5" fill={GOLD_SHADE} />
    <path d="M14 53h36l3 8H11z" fill={GOLD} />
  </svg>
);
