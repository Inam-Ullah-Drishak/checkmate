/**
 * The two surfaces the panel drives: the white king and the black pieces.
 *
 * Each material is created once and mutated in place. Every property the panel
 * exposes is a uniform, so none of them recompiles the shader. Two things are
 * fixed at construction because they *are* shader defines: `fog` (off — nothing
 * in the scene fades with depth now that the board is gone), and the fact that
 * `clearcoat` starts above zero, which is why the panel's slider floor is 0.001
 * rather than 0.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { MeshPhysicalMaterial } from "three";

import type { ChessSceneSettings, SurfaceKey, SurfaceSettings } from "@/types/scene";

const SURFACES: SurfaceKey[] = ["king", "pieces"];

export type SceneMaterials = Record<SurfaceKey, MeshPhysicalMaterial>;

const applySurface = (material: MeshPhysicalMaterial, settings: SurfaceSettings): void => {
  material.color.set(settings.color);
  material.emissive.set(settings.emissive);
  material.emissiveIntensity = settings.emissiveIntensity;
  material.roughness = settings.roughness;
  material.metalness = settings.metalness;
  material.clearcoat = settings.clearcoat;
  material.clearcoatRoughness = settings.clearcoatRoughness;
  material.reflectivity = settings.reflectivity;
  material.envMapIntensity = settings.envMapIntensity;
};

export const createMaterials = (settings: ChessSceneSettings): SceneMaterials => {
  const materials: SceneMaterials = {
    king: new MeshPhysicalMaterial({ fog: false }),
    pieces: new MeshPhysicalMaterial({ fog: false }),
  };

  syncMaterials(materials, settings);
  return materials;
};

export const syncMaterials = (
  materials: SceneMaterials,
  settings: ChessSceneSettings,
  previous?: ChessSceneSettings,
): void => {
  for (const key of SURFACES) {
    if (previous && previous[key] === settings[key]) continue;
    applySurface(materials[key], settings[key]);
  }
};

export const disposeMaterials = (materials: SceneMaterials): void => {
  Object.values(materials).forEach((material) => material.dispose());
};
