/**
 * Live settings store for the chess scene.
 *
 * Zustand rather than plain module constants: the render loop reads it with
 * `useChessSettings.getState()` each frame, so the look can be changed at
 * runtime without re-rendering — or ever restarting — the canvas tree. The
 * tuning panel that used to drive it is gone; the store stayed, because it is
 * also what lets the scene apply a settings change mid-flight.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { create } from "zustand";

import { DEFAULT_SETTINGS } from "@/lib/scene/chess-defaults";
import type {
  CameraSettings,
  ChessSceneSettings,
  LightSettings,
  MotionSettings,
  PostSettings,
  StageSettings,
  SurfaceKey,
  SurfaceSettings,
} from "@/types/scene";

interface ChessSettingsStore extends ChessSceneSettings {
  setSurface: <K extends keyof SurfaceSettings>(
    surface: SurfaceKey,
    key: K,
    value: SurfaceSettings[K],
  ) => void;
  setLight: <K extends keyof LightSettings>(key: K, value: LightSettings[K]) => void;
  setMotion: <K extends keyof MotionSettings>(key: K, value: MotionSettings[K]) => void;
  setCamera: <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => void;
  setStage: <K extends keyof StageSettings>(key: K, value: StageSettings[K]) => void;
  setPost: <K extends keyof PostSettings>(key: K, value: PostSettings[K]) => void;
  reset: () => void;
}

/** Structured-clone the defaults so a `reset()` can never hand back a mutated object. */
const freshDefaults = (): ChessSceneSettings =>
  JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ChessSceneSettings;

export const useChessSettings = create<ChessSettingsStore>()((set) => ({
  ...freshDefaults(),

  setSurface: (surface, key, value) =>
    set((state) => ({ [surface]: { ...state[surface], [key]: value } })),

  setLight: (key, value) => set((state) => ({ lights: { ...state.lights, [key]: value } })),

  setMotion: (key, value) => set((state) => ({ motion: { ...state.motion, [key]: value } })),

  setCamera: (key, value) => set((state) => ({ camera: { ...state.camera, [key]: value } })),

  setStage: (key, value) => set((state) => ({ stage: { ...state.stage, [key]: value } })),

  setPost: (key, value) => set((state) => ({ post: { ...state.post, [key]: value } })),

  reset: () => set(freshDefaults()),
}));
