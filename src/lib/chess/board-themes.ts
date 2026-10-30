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
  classic: { label: "Classic", light: "#e5dfd1", dark: "#58616a", frame: "#30343a", reflect: [0.12, 0.1, 0.08] },
  wood: { label: "Wood", light: "#e4c69f", dark: "#95694a", frame: "#38271d", reflect: [0.12, 0.1, 0.08] },
  marble: { label: "Marble", light: "#d9e3dc", dark: "#537265", frame: "#26362e", reflect: [0.13, 0.12, 0.08] },
  ocean: { label: "Ocean", light: "#d1e2e7", dark: "#4c7887", frame: "#233c47", reflect: [0.12, 0.12, 0.08] },
  slate: { label: "Slate", light: "#d2d7df", dark: "#657080", frame: "#303845", reflect: [0.12, 0.1, 0.08] },
  rose: { label: "Rose", light: "#ead9dc", dark: "#a46c79", frame: "#49343c", reflect: [0.12, 0.1, 0.08] },
  violet: { label: "Violet", light: "#dfd6e8", dark: "#776789", frame: "#352b42", reflect: [0.12, 0.1, 0.08] },
  cosmos: { label: "Galaxy", light: "#47405f", dark: "#211f31", frame: "#171722", reflect: [0.14, 0.1, 0.08], look: "galaxy" },
  ice: { label: "Frozen lake", light: "#d5e1e6", dark: "#58788d", frame: "#2d414e", reflect: [0.14, 0.12, 0.08], look: "ice" },
  blossom: { label: "Blossom", light: "#e8dadd", dark: "#65806b", frame: "#493b35", reflect: [0.12, 0.1, 0.08], look: "blossom" },
  sea: { label: "Beach", light: "#dfd3b8", dark: "#4b7889", frame: "#51483a", reflect: [0.12, 0.12, 0.08], look: "sea" },
  leaf: { label: "Autumn leaves", light: "#dfcfaa", dark: "#765641", frame: "#44382c", reflect: [0.12, 0.1, 0.08], look: "leaf" },
  mahogany: { label: "Mahogany & ivory", light: "#e7d8bd", dark: "#805442", frame: "#3a241c", reflect: [0.12, 0.1, 0.08] },
  sunset: { label: "Sunset", light: "#e8d2b0", dark: "#ad6753", frame: "#51362f", reflect: [0.12, 0.1, 0.08] },
};
