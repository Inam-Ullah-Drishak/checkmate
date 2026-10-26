/**
 * Placeholder copy for the home page.
 *
 * Ported from the Figma hero, with every string rewritten except the company
 * name — the design's own copy was placeholder ("Designed to mean purpose.",
 * four identical "$4B+ / Processed" tiles). This copy describes what the page
 * actually is: a real-time chess scene. Replace with real copy.
 *
 * 📖 Docs: obsidian/frontend/html-semantics.md
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface HomeCopy {
  company: string;
  /** Visually hidden — the page's one `<h1>` for crawlers and screen readers. */
  title: string;
  nav: NavLink[];
  contact: NavLink;
  /** Rendered as two lines, matching the design's two-line headline. */
  headline: string[];
  description: string;
  action: string;
  stats: Stat[];
}

export const homeCopy: HomeCopy = {
  company: "Checkmate.",
  title: "Checkmate — play chess on a 3D board in your browser",
  nav: [
    { label: "Play", href: "/play" },
    { label: "Puzzles", href: "/play?tab=Puzzles" },
    { label: "History", href: "/play?tab=History" },
    { label: "Stats", href: "/play?tab=Stats" },
    { label: "Rules", href: "/play?tab=Rules" },
  ],
  contact: { label: "Settings", href: "/play?tab=Settings" },
  headline: ["Play chess", "in 3D."],
  description:
    "Chess against the computer on a gold and silver 3D board. Five difficulty levels, hints, puzzles and your game history, all kept in your browser.",
  action: "Start a match",
  // The player's record against the computer; values are filled from
  // localStorage in `views/home/player-stats.tsx`, these are the first paint.
  stats: [
    { value: "0", label: "Games won" },
    { value: "0", label: "Games lost" },
    { value: "0", label: "Games drawn" },
    { value: "Medium", label: "Difficulty" },
  ],
};
