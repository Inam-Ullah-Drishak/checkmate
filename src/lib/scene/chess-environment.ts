/**
 * The scene's image-based lighting.
 *
 * A glossy near-black clearcoat material is almost entirely *reflection*: lit
 * by point lights alone the black pieces render as flat silhouettes with a
 * couple of hot dots. What actually draws their edges in the reference frame is
 * a cold panel on one side and a warm one on the other — so the environment is
 * built from exactly that: three emissive quads in an otherwise black room,
 * pre-filtered through `PMREMGenerator`.
 *
 * Rebuilt only when a colour or intensity the panel owns changes, never per
 * frame — PMREM convolution is expensive.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Texture,
  WebGLRenderer,
} from "three";

import type { LightSettings } from "@/types/scene";

export interface EnvironmentHandle {
  texture: Texture;
  dispose: () => void;
}

/** Panel intensities are authored on the same scale as the point lights; this brings them into env range. */
const PANEL_SCALE = 1 / 30;

interface Panel {
  color: string;
  intensity: number;
  position: [number, number, number];
  rotationY: number;
  rotationX: number;
  scale: [number, number];
}

const panelsFor = (lights: LightSettings): Panel[] => [
  {
    color: lights.coldColor,
    intensity: lights.coldIntensity,
    position: [-7, 1.5, -1.5],
    rotationY: Math.PI / 2,
    rotationX: 0,
    scale: [12, 10],
  },
  {
    color: lights.warmColor,
    intensity: lights.warmIntensity,
    position: [7, -1.5, -1],
    rotationY: -Math.PI / 2,
    rotationX: 0,
    scale: [12, 10],
  },
  {
    color: lights.keyColor,
    intensity: lights.keyIntensity * 0.45,
    position: [0, 7, 3],
    rotationY: 0,
    rotationX: -Math.PI / 2,
    scale: [9, 9],
  },
];

export const buildEnvironment = (
  renderer: WebGLRenderer,
  lights: LightSettings,
): EnvironmentHandle => {
  const source = new Scene();
  const geometry = new PlaneGeometry(1, 1);
  const materials: MeshBasicMaterial[] = [];

  for (const panel of panelsFor(lights)) {
    const material = new MeshBasicMaterial({
      // Pre-multiplying by intensity is what makes the quad act as an area light.
      color: new Color(panel.color).multiplyScalar(panel.intensity * PANEL_SCALE),
      side: DoubleSide,
      toneMapped: false,
    });
    materials.push(material);

    const mesh = new Mesh(geometry, material);
    mesh.position.set(...panel.position);
    mesh.rotation.set(panel.rotationX, panel.rotationY, 0);
    mesh.scale.set(panel.scale[0], panel.scale[1], 1);
    source.add(mesh);
  }

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(source, 0.04);
  pmrem.dispose();

  geometry.dispose();
  materials.forEach((material) => material.dispose());

  return { texture: target.texture, dispose: () => target.dispose() };
};

/** Does a settings change actually require re-running the PMREM convolution? */
export const environmentSignature = (lights: LightSettings): string =>
  [
    lights.coldColor,
    lights.coldIntensity,
    lights.warmColor,
    lights.warmIntensity,
    lights.keyColor,
    lights.keyIntensity,
  ].join("|");
