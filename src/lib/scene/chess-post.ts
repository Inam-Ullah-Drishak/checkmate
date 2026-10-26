/**
 * Post-processing chain.
 *
 * Bloom is what turns the king's faint emissive into the halo the reference
 * has, and depth of field is what throws the pieces nearest the camera out of
 * focus the way the reference does — the composition depends on both, so
 * neither is decoration.
 *
 * Depth of field is the most expensive pass here: it is off on non-desktop
 * tiers, and toggling it rebuilds the effect pass rather than leaving a
 * no-op pass in the chain rendering a full screen for nothing.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md · .claude/skills/optimize-3d-scene §7
 */

import {
  BloomEffect,
  DepthOfFieldEffect,
  EffectPass,
  EffectComposer,
  RenderPass,
  VignetteEffect,
} from "postprocessing";
import { Camera, Scene, Vector3, WebGLRenderer } from "three";

import type { PostSettings } from "@/types/scene";

export interface PostChain {
  render: (delta: number) => void;
  setSize: (width: number, height: number) => void;
  sync: (post: PostSettings) => void;
  dispose: () => void;
}

export const createPostChain = (
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  allowDepthOfField: boolean,
  settings: PostSettings,
): PostChain => {
  const composer = new EffectComposer(renderer, { multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    intensity: settings.bloomIntensity,
    luminanceThreshold: settings.bloomThreshold,
    luminanceSmoothing: settings.bloomSmoothing,
  });

  const vignette = new VignetteEffect({ offset: 0.26, darkness: settings.vignette });

  const depthOfField = new DepthOfFieldEffect(camera, {
    focusRange: settings.focusRange,
    bokehScale: settings.bokehScale,
    resolutionScale: 0.5,
  });
  // Autofocus on the king rather than a fixed distance, so the focal plane
  // follows it if the composition is retuned from the panel.
  depthOfField.target = new Vector3(0, 0, 0);

  let effectPass: EffectPass | null = null;
  let dofEnabled: boolean | null = null;

  const rebuild = (enabled: boolean): void => {
    if (dofEnabled === enabled) return;
    dofEnabled = enabled;

    if (effectPass) {
      composer.removePass(effectPass);
      effectPass.dispose();
    }

    effectPass = enabled
      ? new EffectPass(camera, depthOfField, bloom, vignette)
      : new EffectPass(camera, bloom, vignette);
    composer.addPass(effectPass);
  };

  /**
   * A depth-of-field pass at `bokehScale: 0` produces no blur but still renders
   * its full chain every frame. Treat zero as off — same image, one fewer pass.
   * (`optimize-3d-scene` §7: skip a pass that contributes nothing.)
   */
  const wanted = (post: PostSettings): boolean =>
    allowDepthOfField && post.depthOfField && post.bokehScale > 0;

  rebuild(wanted(settings));

  return {
    render: (delta) => composer.render(delta),
    setSize: (width, height) => composer.setSize(width, height),

    sync: (post) => {
      bloom.intensity = post.bloomIntensity;
      bloom.luminanceMaterial.threshold = post.bloomThreshold;
      bloom.luminanceMaterial.smoothing = post.bloomSmoothing;
      vignette.darkness = post.vignette;
      depthOfField.bokehScale = post.bokehScale;
      depthOfField.cocMaterial.focusRange = post.focusRange;
      rebuild(wanted(post));
    },

    dispose: () => {
      effectPass?.dispose();
      depthOfField.dispose();
      bloom.dispose();
      vignette.dispose();
      composer.dispose();
    },
  };
};
