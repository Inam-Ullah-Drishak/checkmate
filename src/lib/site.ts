/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { getServerEnv, publicEnv } from "@/env";

/**
 * Vercel's production domain, read at build time — the fallback when a deploy
 * doesn't set `NEXT_PUBLIC_SITE_URL` (none did: the live canonical said
 * localhost). Server-only: every consumer of `siteConfig` renders on the server.
 */
const vercelProduction = getServerEnv().VERCEL_PROJECT_PRODUCTION_URL;

export const siteConfig = {
  name: "Checkmate",
  description:
    "Play chess against the computer on a 3D gold and silver board, right in your browser. Hints, puzzles, game history and four difficulty levels.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url:
    publicEnv.NEXT_PUBLIC_SITE_URL ??
    (vercelProduction ? `https://${vercelProduction}` : "http://localhost:3000"),
  twitterHandle: "@checkmate",
  author: "Checkmate",
  /**
   * Browser theme-color (address bar / PWA). The page background, so the chrome
   * blends into it rather than framing it.
   */
  themeColor: "#004AC7",
} as const;

/**
 * Brand colours for the generated icon and share image.
 *
 * Duplicated from `globals.css` on purpose: `next/og` rasterises in a Node
 * context with no stylesheet and no CSS custom properties, so the tokens cannot
 * reach it. Keep in step with `--raw-color-brand-600` and `--raw-color-white`.
 */
export const brandMark = {
  background: "#004AC7",
  foreground: "#ffffff",
  /** The wordmark. The favicon is the king piece, drawn in `lib/king-mark.tsx`. */
  wordmark: "Checkmate.",
  /**
   * Short line for the share card.
   *
   * Not `siteConfig.description` — that is written for search results and runs
   * long enough to overflow a 1200 × 630 card at display size.
   */
  tagline: "Play the board in real time.",
} as const;
