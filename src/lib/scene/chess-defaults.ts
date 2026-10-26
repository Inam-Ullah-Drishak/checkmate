/**
 * Default look of the chess scene — the single source of truth for it.
 *
 * These are **scene data**, not styling: they are uniforms and material
 * parameters fed to WebGL, which has no access to the CSS cascade, so the
 * design-token rule (which governs `className` and inline styles) does not
 * reach here. Same role `lib/springs/config.ts` plays for the spring system:
 * one config module rather than literals sprinkled through components.
 *
 * The values below reproduce the supplied reference frame — a black void, a
 * glowing white king, and glossy black pieces picking up one cold and one warm
 * rim light.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import type { ChessSceneSettings, SurfaceSettings } from "@/types/scene";

/** Path of the GLB and its Draco decoder — kept local, never a CDN. */
export const CHESS_MODEL_URL = "/assets/chess.glb";
export const DRACO_DECODER_PATH = "/draco/";

/**
 * Node names inside `chess.glb`.
 *
 * The GLB also carries a `deck` (the board). It is deliberately not loaded —
 * the board was dropped, and `DEFAULT_SETTINGS.stage.color` does what its last
 * remaining use (a single flat fill) did.
 */
export const KING_NODE = "king";
export const PIECE_NODES = ["1", "2", "3", "4", "5", "6", "7"] as const;

/**
 * Clip planes only. Framing (fov, distance, height, target) is live in the
 * panel — see `DEFAULT_SETTINGS.camera` — because it is the first thing anyone
 * reaches for and it used to be a module constant no preset could carry.
 */
export const CAMERA_CLIP = {
  near: 0.5,
  far: 70,
};

/** Target world height each piece is normalised to, so model scale is irrelevant. */
export const PIECE_HEIGHTS = [2.35, 2.15, 1.65, 1.65, 1.65, 2, 1.8];

/**
 * Fraction of a piece's true half-width used as its collision-capsule radius.
 *
 * The capsule already follows the piece's own axis, so this is a small inset
 * rather than a correction: slightly under 1 lets the widest parts (the bases)
 * visually kiss instead of stopping a hair apart, while the narrower stems —
 * which the capsule over-estimates — keep a plausible gap.
 */
export const CONTACT_FIT = 0.82;

const surface = (settings: SurfaceSettings): SurfaceSettings => settings;

export const DEFAULT_SETTINGS: ChessSceneSettings = {
  // Real gold: bare polished metal (no clearcoat), its colour is the metal's
  // reflectance, and it is lit by the environment panels rather than by any glow.
  // The king and the orbiting pieces are the same material.
  king: surface({
    color: "#ffd37f",
    roughness: 0.27,
    metalness: 1,
    clearcoat: 0.001,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5,
    envMapIntensity: 1.7,
    emissive: "#000000",
    emissiveIntensity: 0,
  }),
  pieces: surface({
    color: "#ffd37f",
    roughness: 0.27,
    metalness: 1,
    clearcoat: 0.001,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5,
    envMapIntensity: 1.7,
    emissive: "#000000",
    emissiveIntensity: 0,
  }),
  lights: {
    ambientIntensity: 0,
    keyColor: "#ffffff",
    keyIntensity: 66,
    coldColor: "#ffffff",
    coldIntensity: 41,
    warmColor: "#ffe3b0",
    warmIntensity: 84,
    coreColor: "#ffffff",
    coreIntensity: 8,
    envIntensity: 1.2,
  },
  motion: {
    pieceCount: 12,
    kingTilt: 0.22,
    // Raised above the supplied presets (0.32, then 0.65) on request — a full
    // precession now takes ~5.7s.
    kingSpin: 1.1,
    kingSize: 3.1,
    // Raised from 0.12 on request. With the precession gone this is the king's
    // only large movement, so it carries the scene rather than decorating it.
    kingAim: 0.45,
    orbitSpeed: 0.17,
    // Tighter than the 3.9 it replaced, but not so tight that the swarm closes
    // over the king on the magnet's inward stroke — the pieces are ~1.3× larger
    // now, so the shell has to clear their half-length plus the king's capsule.
    orbitRadius: 3.5,
    // Raised repeatedly on request (0.6 → 0.85 → here). The inward stroke now
    // presses the swarm right onto the king's capsule; the capsule contacts are
    // the only thing stopping them reaching it.
    magnetAmount: 1.25,
    magnetSpeed: 0.55,
    cursorForce: 26,
    cursorRadius: 2.6,
    // Low drag is what makes a cursor hit read as a shove rather than a nudge —
    // a scattered piece coasts for seconds before the shell spring reels it in.
    drag: 0.42,
    bounce: 0.55,
  },
  camera: {
    fov: 32,
    // Pulled in from 12.5. Moving the camera rather than narrowing the fov keeps
    // the perspective on the pieces — a tighter fov would flatten them.
    distance: 10,
    height: 1.25,
    // Aimed slightly below the king, which is where the composition sat when
    // the board was still a surface being looked down at.
    target: 0.1,
  },
  stage: {
    // Carried over from the board's solid fill, which is what this replaced.
    color: "#0b2a6f",
  },
  post: {
    // Zero: nothing blooms. Like `bokehScale` below, a contributing-nothing pass
    // is dropped from the chain rather than rendered — see `chess-post.ts`.
    bloomIntensity: 0,
    bloomThreshold: 0.79,
    bloomSmoothing: 0,
    depthOfField: true,
    focusRange: 3.4,
    bokehScale: 5.9,
    vignette: 0,
  },
};
