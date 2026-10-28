/**
 * Board looks: the colours of the light squares, the dark squares and the
 * frame. Shared by the 3D scene and the small previews in the settings page.
 * These are material parameters for three.js, not page styling.
 */

import type { BoardLook } from "@/lib/chess/board-textures";
import type { ThemeId } from "@/lib/chess/storage";

export interface BoardTheme {
  label: string;
  light: string;
  dark: string;
  frame: string;
  /** `envMapIntensity` for light squares, dark squares, frame. */
  reflect: [number, number, number];
  /** A painted look for the squares (see `board-textures.ts`); without one the squares are plain colours. */
  look?: BoardLook;
}

export const BOARD_THEMES: Record<ThemeId, BoardTheme> = {
  classic: { label: "Classic", light: "#ecebe6", dark: "#030303", frame: "#020202", reflect: [0.5, 0.12, 0.1] },
  wood: { label: "Wood", light: "#f0d9b5", dark: "#a8774f", frame: "#3d2412", reflect: [0.3, 0.12, 0.1] },
  marble: { label: "Marble", light: "#e8eee9", dark: "#2c4a3a", frame: "#15241c", reflect: [0.5, 0.35, 0.15] },
  ocean: { label: "Ocean", light: "#d3e9f2", dark: "#2b6f94", frame: "#0c2938", reflect: [0.4, 0.25, 0.12] },
  slate: { label: "Slate", light: "#cfd5de", dark: "#4a5567", frame: "#1b212b", reflect: [0.4, 0.25, 0.12] },
  rose: { label: "Rose", light: "#f7e6e8", dark: "#b25a6e", frame: "#47202b", reflect: [0.4, 0.25, 0.12] },
  violet: { label: "Violet", light: "#e7e0f3", dark: "#5a3d8e", frame: "#221737", reflect: [0.4, 0.25, 0.12] },
  cosmos: { label: "Galaxy", light: "#5a4aa6", dark: "#07060d", frame: "#050408", reflect: [0.6, 0.25, 0.3], look: "galaxy" },
  ice: { label: "Frozen lake", light: "#e6f3fb", dark: "#1d4a78", frame: "#10283f", reflect: [0.7, 0.5, 0.3], look: "ice" },
  blossom: { label: "Blossom", light: "#fbe7ee", dark: "#2f6a46", frame: "#3b2a22", reflect: [0.4, 0.25, 0.12], look: "blossom" },
  sea: { label: "Beach", light: "#f2e0b5", dark: "#145d8a", frame: "#5a4630", reflect: [0.3, 0.45, 0.12], look: "sea" },
  leaf: { label: "Autumn leaves", light: "#f3dcae", dark: "#3a1f0e", frame: "#24120a", reflect: [0.3, 0.2, 0.1], look: "leaf" },
  sunset: { label: "Sunset", light: "#ffe8c4", dark: "#cf5237", frame: "#47190f", reflect: [0.35, 0.2, 0.1] },
};
