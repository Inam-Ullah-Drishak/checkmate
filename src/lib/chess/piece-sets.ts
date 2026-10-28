/**
 * Piece designs: the same 3D piece shapes in different materials. Each set has
 * a look for the white side and one for the black side, and the names the game
 * uses for the two teams ("Silver to move", "Gold wins").
 *
 * These are material parameters for three.js (colours, metalness, roughness),
 * not page styling, so they live here rather than in the CSS tokens.
 */

export type PieceSetId = "gold-silver" | "wood-emerald" | "ruby-sapphire" | "amethyst-turquoise" | "obsidian-coral" | "copper-navy" | "rose-slate" | "lime-plum";

export interface Finish {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  /** Below 1 the piece is see-through, like glass. */
  opacity?: number;
}

export interface PieceSet {
  label: string;
  /** Readable-on-dark colours for the two words of the label, in label order. */
  tint: [string, string];
  /** What the two teams are called, white first. */
  names: { w: string; b: string };
  w: Finish;
  b: Finish;
}

export const PIECE_SETS: Record<PieceSetId, PieceSet> = {
  "gold-silver": {
    label: "Gold & silver",
    tint: ["#f5b400", "#e6e9ee"],
    names: { w: "Silver", b: "Gold" },
    w: { color: "#e6e9ee", metalness: 1, roughness: 0.12, clearcoat: 0 },
    b: { color: "#f5b400", metalness: 1, roughness: 0.16, clearcoat: 0 },
  },
  "wood-emerald": {
    label: "Wood & emerald",
    tint: ["#c98a52", "#2fbf7a"],
    names: { w: "Wood", b: "Emerald" },
    w: { color: "#8c5a2b", metalness: 0, roughness: 0.55, clearcoat: 0.3 },
    b: { color: "#06683b", metalness: 0.25, roughness: 0.22, clearcoat: 0.8 },
  },
  "ruby-sapphire": {
    label: "Ruby & sapphire",
    tint: ["#ff4a63", "#5b8cff"],
    names: { w: "Ruby", b: "Sapphire" },
    w: { color: "#d4172f", metalness: 0.55, roughness: 0.2, clearcoat: 0.8 },
    b: { color: "#2159e0", metalness: 0.55, roughness: 0.2, clearcoat: 0.8 },
  },
  "amethyst-turquoise": {
    label: "Amethyst & turquoise",
    tint: ["#b566ff", "#2fd6d0"],
    names: { w: "Amethyst", b: "Turquoise" },
    w: { color: "#7a35c7", metalness: 0.35, roughness: 0.2, clearcoat: 0.8 },
    b: { color: "#079a9a", metalness: 0.35, roughness: 0.2, clearcoat: 0.8 },
  },
  "obsidian-coral": {
    label: "Obsidian & coral",
    tint: ["#9a9aa8", "#ff7a62"],
    names: { w: "Coral", b: "Obsidian" },
    w: { color: "#e8573f", metalness: 0.2, roughness: 0.3, clearcoat: 0.8 },
    b: { color: "#15151a", metalness: 0.5, roughness: 0.12, clearcoat: 1 },
  },
  "copper-navy": {
    label: "Copper & navy",
    tint: ["#d9915a", "#6b86e8"],
    names: { w: "Copper", b: "Navy" },
    w: { color: "#c27a45", metalness: 1, roughness: 0.22, clearcoat: 0 },
    b: { color: "#16307a", metalness: 0.3, roughness: 0.3, clearcoat: 0.7 },
  },
  "rose-slate": {
    label: "Rose gold & slate",
    tint: ["#f0b3a2", "#8d97a8"],
    names: { w: "Rose gold", b: "Slate" },
    w: { color: "#e3a493", metalness: 1, roughness: 0.18, clearcoat: 0 },
    b: { color: "#47505e", metalness: 0.4, roughness: 0.3, clearcoat: 0.6 },
  },
  "lime-plum": {
    label: "Lime & plum",
    tint: ["#a6e22e", "#c46bc0"],
    names: { w: "Lime", b: "Plum" },
    w: { color: "#8fcc12", metalness: 0.2, roughness: 0.3, clearcoat: 0.8 },
    b: { color: "#5a1d58", metalness: 0.3, roughness: 0.25, clearcoat: 0.9 },
  },
};

export const PIECE_SET_IDS = Object.keys(PIECE_SETS) as PieceSetId[];
