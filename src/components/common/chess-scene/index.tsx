"use client";

/**
 * Code-split entry point for the chess scene.
 *
 * `ssr: false` is what keeps three.js, drei and the post-processing chain out
 * of the initial bundle — they land in their own chunk that only a real browser
 * ever fetches. A Server Component cannot declare `ssr: false`, which is why
 * this thin client wrapper exists.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import dynamic from "next/dynamic";

export const LazyChessScene = dynamic(
  () => import("@/components/common/chess-scene/chess-scene").then((module) => module.ChessScene),
  { ssr: false },
);
