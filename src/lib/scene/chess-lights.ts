/**
 * The real-time half of the lighting rig — the diffuse shaping the environment
 * map cannot do on its own.
 *
 * Four lights, and the count never changes for the session: three recompiles
 * every material in the scene, which is a visible stall. Everything the panel
 * touches is colour and intensity, both of which are plain uniform writes.
 *
 * Intensities are in physical units (candela, falling off with distance²),
 * which is why the numbers look large next to pre-r155 three.js examples.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { AmbientLight, Object3D, PointLight, SpotLight } from "three";

import type { LightSettings } from "@/types/scene";

export interface LightRig {
  root: Object3D;
  sync: (lights: LightSettings) => void;
  dispose: () => void;
}

export const createLightRig = (): LightRig => {
  const root = new Object3D();

  const ambient = new AmbientLight(0xffffff, 0);

  // Ranges are deliberately short. These light the king and the orbit shell;
  // letting them reach the board turns a 35-unit plane into a lit grey wall and
  // the black void the composition depends on is gone.
  const key = new SpotLight(0xffffff, 0, 15, 0.62, 1, 2);
  key.position.set(3.2, 5, 6.5);

  // Held well outside the orbit shell: a rim light close enough to be inside it
  // blows out whichever piece happens to swing past, since intensity falls off
  // with distance². The rim *look* comes from the environment panels.
  const cold = new PointLight(0xffffff, 0, 16, 2);
  cold.position.set(-8.5, 2.2, -4);

  const warm = new PointLight(0xffffff, 0, 16, 2);
  warm.position.set(8.5, -1.8, -3.5);

  // Sits inside the king — what makes it read as the light source itself.
  const core = new PointLight(0xffffff, 0, 5.5, 2);
  core.position.set(0, 0.3, 0.7);

  root.add(ambient, key, key.target, cold, warm, core);

  return {
    root,

    sync: (lights) => {
      ambient.intensity = lights.ambientIntensity;
      key.color.set(lights.keyColor);
      key.intensity = lights.keyIntensity;
      cold.color.set(lights.coldColor);
      cold.intensity = lights.coldIntensity;
      warm.color.set(lights.warmColor);
      warm.intensity = lights.warmIntensity;
      core.color.set(lights.coreColor);
      core.intensity = lights.coreIntensity;
    },

    dispose: () => {
      [ambient, key, cold, warm, core].forEach((light) => light.dispose());
      root.clear();
    },
  };
};
