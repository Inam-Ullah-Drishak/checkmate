/**
 * Types for the chess WebGL scene and its live settings panel.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

/**
 * Everything the panel can change on a `MeshPhysicalMaterial`.
 *
 * `clearcoat` is deliberately never allowed to reach exactly 0 — three derives
 * the `USE_CLEARCOAT` shader define from `clearcoat > 0`, so crossing zero
 * recompiles the program mid-session (a visible stall). The slider floor in
 * `MATERIAL_CONTROLS` keeps it above zero instead.
 */
export interface SurfaceSettings {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  reflectivity: number;
  envMapIntensity: number;
  emissive: string;
  emissiveIntensity: number;
}

export interface LightSettings {
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  coldColor: string;
  coldIntensity: number;
  warmColor: string;
  warmIntensity: number;
  coreColor: string;
  coreIntensity: number;
  envIntensity: number;
}

export interface MotionSettings {
  pieceCount: number;
  kingTilt: number;
  kingSpin: number;
  kingSize: number;
  /** Radians the king leans toward the pointer at the edge of the viewport. */
  kingAim: number;
  orbitSpeed: number;
  orbitRadius: number;
  magnetAmount: number;
  magnetSpeed: number;
  cursorForce: number;
  cursorRadius: number;
  /** Velocity decay per second. Lower = more inertia after a cursor hit. */
  drag: number;
  /** Restitution of piece-to-piece contact, 0 = dead, 1 = perfectly elastic. */
  bounce: number;
}

export interface CameraSettings {
  /** Vertical field of view, degrees. */
  fov: number;
  /** Distance back from the origin along +Z. */
  distance: number;
  /** Height above the origin. */
  height: number;
  /** Height of the point the camera aims at. */
  target: number;
}

/**
 * What sits behind the pieces.
 *
 * This replaced the chessboard. The board had been reduced to a single flat
 * colour (`board.solid`) before it was dropped, and a flat colour is what the
 * renderer's clear colour already is — so the plane, its two geometries, its
 * three materials and the fog that faded its far edge all went, and this one
 * value does the same job.
 */
export interface StageSettings {
  color: string;
}

export interface PostSettings {
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  depthOfField: boolean;
  /** Depth of the in-focus slab, in world units, centred on the king. */
  focusRange: number;
  bokehScale: number;
  vignette: number;
}

/** The independently-tweakable surfaces in the scene. */
export type SurfaceKey = "king" | "pieces";

export interface ChessSceneSettings {
  king: SurfaceSettings;
  pieces: SurfaceSettings;
  lights: LightSettings;
  motion: MotionSettings;
  camera: CameraSettings;
  stage: StageSettings;
  post: PostSettings;
}
